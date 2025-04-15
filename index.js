const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const app = express();


app.use(bodyParser.json());
app.use('/auth', authRoutes);

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port https://localhost:${port}`);
});
