const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 5000;
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@mern.atgqzad.mongodb.net/?retryWrites=true&w=majority&appName=MERN`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = async (req, res, next) => {
  console.log('logger middle', req.hostname, req.originalUrl);
  next();
}

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log('value nit token', token);
  if (!token) {
    return res.status(403).send({ message: 'not authorized' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(403).send({ message: 'not Unauthorized' });
    }
    console.log('value in the code', decoded);
    req.user = decoded;
    next();
  });
}


async function run() {
  try {
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('booking');

    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1, customerName: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    app.post('/jwt',logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'none'
      });
      res.send({ success: true, token });
    });
    

    app.get('/booking', async (req, res) => {
      console.log(req.query.email);
      console.log('valid user', req.user);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.delete('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.put('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const updatedBooking = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedBooking,
      };
      const result = await bookingCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.post('/booking', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('bmw car running');
});

app.listen(port, () => {
  console.log(`car doctor running on port ${port}`);
});
