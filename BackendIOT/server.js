import express, { query } from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import mqtt from 'mqtt';


//mqtt

const mqttBroker = "mqtt://192.168.1.107:2000";
const mqttOptions = {
    username: "huy",
    password: "123456",
};
const client = mqtt.connect(mqttBroker, mqttOptions);

client.on("connect", () => {
    console.log("Connected to MQTT broker");
});

//db
const app = express();
app.use(cors());
app.use(express.json());
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'huy311202',
    database: 'backendiot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});



//dataSensor

app.get('/getAllDashboard', (req, res) => {
    const sql = "SELECT * FROM sensor";

    db.query(sql, (err, result) => {
        if (err) return res.json({ Message: 'error' });
        return res.json(result);
    })
})

app.get('/getAllSensor', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // Sắp xếp dữ liệu theo cột 'datetime' theo thứ tự giảm dần
    const sql = `SELECT * FROM sensor ORDER BY datetime DESC LIMIT ?, ?`;
    const values = [offset, pageSize];
    
    db.query(sql, values, (err, result) => {
        if (err) return res.json({ Message: 'error' });
        return res.json(result);
    });
});


app.post('/insertSensor', (req, res) => {
    const { temperature, humidity, brightness, datetime } = req.body;

    const sql = "INSERT INTO sensor (temperature, humidity, brightness, datetime) VALUES (?, ?, ?, ?)";
    const values = [temperature, humidity, brightness, datetime];

    db.query(sql, values, (err, result) => {
        if (err) return res.json({ Message: 'error' });
        return res.json({ Message: 'success' });
    });
});

app.get('/sortDataSensor', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
    const sortBy = req.query.sortBy; // Trường muốn sắp xếp

    let sql = '';
    let values = [];

    switch (sortBy) {
        case 'temperature':
        case 'humidity':
        case 'brightness':
            sql = `SELECT * FROM sensor ORDER BY ${sortBy} ${sortOrder} LIMIT ?, ?`;
            values = [offset, pageSize];
            break;
        default:
            return res.json({ Message: 'Invalid sort field' });
    }

    db.query(sql, values, (err, result) => {
        if (err) return res.json({ Message: 'error' });
        return res.json(result);
    });
});

app.get('/searchDataSensor', (req, res) => {
    const { type, value, page, pageSize } = req.query;

    if (!type || !value) {
        return res.status(400).json({ Message: 'Type and value are required in query parameters' });
    }

    const parsedPage = parseInt(page) || 1;
    const parsedPageSize = parseInt(pageSize) || 10;
    const offset = (parsedPage - 1) * parsedPageSize;

    let sql = '';
    let errorMessage = '';

    switch (type) {
        case 'temperature':
            sql = 'SELECT * FROM sensor WHERE temperature = ? LIMIT ?, ?';
            errorMessage = 'Temperature is required in query parameters';
            break;
        case 'humidity':
            sql = 'SELECT * FROM sensor WHERE humidity = ? LIMIT ?, ?';
            errorMessage = 'Humidity is required in query parameters';
            break;
        case 'brightness':
            sql = 'SELECT * FROM sensor WHERE brightness = ? LIMIT ?, ?';
            errorMessage = 'Brightness is required in query parameters';
            break;
        default:
            return res.status(400).json({ Message: 'Invalid type specified' });
    }

    const values = [value, offset, parsedPageSize];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(`Error while searching ${type}:`, err);
            return res.status(500).json({ Message: 'Internal Server Error' });
        }
        return res.json(result);
    });
});

//actionHistory
app.get('/getActionHistory', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const sql = `SELECT * FROM action ORDER BY datetime desc LIMIT ?, ?`;
    const values = [offset, pageSize];

    db.query(sql, values, (err, result) => {
        if (err) return res.json({ Message: 'error' });
        return res.json(result);
    });
});

app.post('/insertActionHistory', (req, res) => {
    const { device, mode, datetime } = req.body;

    const sql = "INSERT INTO action (device, mode, datetime) VALUES (?, ?, ?)";
    const values = [device, mode, datetime];

    db.query(sql, values, (err, result) => {
        if (err) return res.json({ Message: 'error' });
        return res.json({ Message: 'success' });
    });
});
app.get('/searchByDate', (req, res) => {
    const { date, page, pageSize, sortOrder } = req.query;

    if (!date) {
        return res.status(400).json({ Message: 'Date is required in query parameters' });
    }

    const parsedPage = parseInt(page) || 1;
    const parsedPageSize = parseInt(pageSize) || 10;
    const offset = (parsedPage - 1) * parsedPageSize;
    const order = sortOrder && sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const sql = 'SELECT * FROM action WHERE DATE(datetime) = ? ORDER BY datetime ' + order + ' LIMIT ?, ?';
    const values = [date, offset, parsedPageSize];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error while searching actions by date:", err);
            return res.status(500).json({ Message: 'Internal Server Error' });
        }
        return res.json(result);
    });
});
app.get('/searchDevice', (req, res) => {
    const { type, page, pageSize } = req.query;
    const parsedPage = parseInt(page) || 1;
    const parsedPageSize = parseInt(pageSize) || 10;
    const offset = (parsedPage - 1) * parsedPageSize;
    let sql = '';

    switch (type) {
        case 'led':
            sql = 'SELECT * FROM action WHERE device = "led" LIMIT ?, ?';
            break;
        case 'fan':
            sql = 'SELECT * FROM action WHERE device = "fan" LIMIT ?, ?';
            break;
        case 'on':
            sql = 'SELECT * FROM action WHERE mode = "on" LIMIT ?, ?';
            break;
        case 'off':
            sql = 'SELECT * FROM action WHERE mode = "off" LIMIT ?, ?';
            break;
        default:
            return res.status(400).json({ Message: 'Invalid type specified' });
    }
    const values = [offset, parsedPageSize];
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(`Error while searching ${type}:`, err);
            return res.status(500).json({ Message: 'Internal Server Error' });
        }
        return res.json(result);
    });
});

app.post("/toggle", (req, res) => {
    const { mode, device } = req.body;

    const sql = `INSERT INTO action (id, device, mode, datetime) VALUES (NULL, ?, ?, NOW())`;
    db.query(
        sql,
        [
            device,
            mode,
            device === "Fan" ? "device/ledD6" : "device/ledD7",
        ],
        (error, results, fields) => {
            if (error) {
                console.error("Error inserting data into MySQL:", error);
                res.status(500).json({ message: "Internal Server Error" });
                return;
            }
            console.log("Data inserted into MySQL successfully");
            const mqttTopic = device === "Fan" ? "device/ledD6" : "device/ledD7";

            const mqttMessage = mode === "on" ? "on" : "off";
            client.publish(mqttTopic, mqttMessage);

            res.json({
                message:
                    "Toggle request received and data inserted into MySQL successfully.",
            });
        }
    );
});

app.get("/status", async (req, res) => {
    try {
        const sql = `
        SELECT a.device, a.mode, a.datetime
        FROM action a
        INNER JOIN (
          SELECT device, MAX(datetime) AS max_date
          FROM action
          GROUP BY device
        ) b ON a.device = b.device AND a.datetime = b.max_date
      `;

        db.query(sql, (err, rows) => {
            if (err) {
                console.error("Error executing query:", err);
                res.status(500).send("Server error");
                return;
            }

            const results = {};
            for (let row of rows) {
                results[row.device] = row.status;
            }

            res.json(results);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.listen(8081, () => {
    console.log("http://localhost:8081");
})
