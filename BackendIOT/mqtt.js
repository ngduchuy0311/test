import mqtt from "mqtt";
import mysql from 'mysql2';

const mqttBroker = "mqtt://192.168.1.13:1999";
const mqttOptions = {
  username: "huy",
  password: "123456",
};
const mqttTopic = "data";

// MySQL Database settings
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'huy311202',
  database: 'backendiot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL: ", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// Connect to MQTT broker
const client = mqtt.connect(mqttBroker, mqttOptions);

client.on("connect", () => {
  console.log("Connected to MQTT broker");
  client.subscribe([mqttTopic, "device/ledD6", "device/ledD7"]);
});

client.on("message", (topic, message) => {
  if (topic === mqttTopic) {
    const data = JSON.parse(message);
    let { temperature, humidity, light_intensity } = data;

    const query =
      " INSERT INTO sensor (id, temperature, humidity, brightness, datetime) VALUES (NULL, ROUND(?, 2), ?, ?, NOW());"

    const values = [temperature, humidity, light_intensity];

    db.query(query, values, (error, results, fields) => {
      if (error) {
        console.error("Error inserting data into MySQL: ", error);
      } else {
        console.log("Data inserted into MySQL");
      }
    });
  } else if (topic === "device/ledD6" || topic === "device/ledD7") {
    // Xử lý lệnh điều khiển từ MQTT broker
    const device = topic === "device/ledD6" ? "ledD6" : "ledD7";
    const mode = message.toString(); // Chuyển đổi dữ liệu nhận được thành chuỗi

    // Thực hiện cập nhật trạng thái của thiết bị vào cơ sở dữ liệu
    const updateQuery = "INSERT INTO action (id, device, mode, datetime) VALUES (NULL, ?, ?, NOW())";
    const updateValues = [device, mode];

    db.query(updateQuery, updateValues, (error, results, fields) => {
      if (error) {
        console.error("Error updating device status in MySQL: ", error);
      } else {
        console.log("Device status updated in MySQL");
      }
    });
  }
});

// Handle errors
client.on("error", (err) => {
  console.error("MQTT error:", err);
});

db.on("error", (err) => {
  console.error("MySQL error:", err);
});
