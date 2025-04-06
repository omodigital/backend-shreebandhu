require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Multer Configuration
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
      return cb(new Error('Only .jpg, .jpeg, and .png files are allowed'));
    }
    cb(null, true);
  },
});

// Add Product
app.post('/api/products', upload.single('image'), (req, res) => {
  const { name, mainTitle, subTitle, price, mrp, rating, reviews, weight, category } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = 'INSERT INTO products (name, mainTitle, subTitle, price, mrp, image, rating, reviews, weight, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const values = [name, mainTitle, subTitle, price, mrp, image, rating, reviews, weight, category];

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error saving product:', err);
      return res.status(500).send('Error saving product');
    }
    res.send({ id: result.insertId, ...req.body, image });
  });
});

// Get All Products
app.get('/api/products', (req, res) => {
  const sql = 'SELECT * FROM products';
  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).send('Error fetching products');
    }
    res.send(results);
  });
});

// Delete Product
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM products WHERE id = ?';
  pool.query(sql, [id], (err) => {
    if (err) {
      console.error('Error deleting product:', err);
      return res.status(500).send('Error deleting product');
    }
    res.send({ message: 'Product deleted successfully' });
  });
});

// Update Product
app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, mainTitle, subTitle, price, mrp, rating, reviews, weight, category } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  let sql = `
    UPDATE products SET 
    name=?, mainTitle=?, subTitle=?, price=?, mrp=?, rating=?, reviews=?, weight=?, category=?
  `;
  const values = [name, mainTitle, subTitle, price, mrp, rating, reviews, weight, category];

  if (image) {
    sql += ', image=?';
    values.push(image);
  }

  sql += ' WHERE id=?';
  values.push(id);

  pool.query(sql, values, (err) => {
    if (err) {
      console.error('Error updating product:', err);
      return res.status(500).send('Error updating product');
    }
    res.send({ message: 'Product updated successfully' });
  });
});

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
