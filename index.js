const express = require('express');
const mysql = require('mysql2');

const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MySQL Connection Setup
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

// Multer for File Uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// Add Product
app.post('/api/products', upload.single('image'), (req, res) => {
  const { name, mainTitle, subTitle, price, mrp, rating, reviews, weight, category } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = 'INSERT INTO products (name, mainTitle, subTitle, price, mrp, image, rating, reviews, weight, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  
  // Use connection for the query
  connection.query(sql, [name, mainTitle, subTitle, price, mrp, image, rating, reviews, weight, category], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error saving product');
    } else {
      res.send({ id: result.insertId, ...req.body, image });
    }
  });
});

// Get All Products
app.get('/api/products', (req, res) => {
  const sql = 'SELECT * FROM products';

  // Use connection for the query
  connection.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching products');
    } else {
      res.send(results);
    }
  });
});

// Delete Product
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM products WHERE id = ?';

  // Use connection for the query
  connection.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error deleting product');
    } else {
      res.send({ message: 'Product deleted successfully' });
    }
  });
});

// Start Server
const PORT = 3306;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
