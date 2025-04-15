const express = require('express');
const authRoutes = require('./routes/authRoutes');
const app = express();

require('dotenv').config(); 
app.use(express.json());
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
app.use('/auth', authRoutes);

app.use((req, res, next) => {
    res.status(404).send({
        message: "Kemana man??",
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
