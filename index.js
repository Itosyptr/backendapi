const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const app = express();

app.use(bodyParser.json());
app.use('/auth', authRoutes);

app.use((req, res, next) => {
    res.status(404).send({
        message: "Kemana man??",
    });
});


app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.get("/", (req, res) => {
    res.send({
        message: "Api Smartdorm",
        author: "Smartdorm",
    });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
