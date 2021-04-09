const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require("./configs/grocery-f62c8-firebase-adminsdk-x5khz-766450e4e1.json");
const ObjectId = require('mongodb').ObjectId;
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config()

const port = 5055;
const app = express()

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIRE_DB
});

app.use(cors());
app.use(bodyParser.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rzg3r.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
    const productCollection = client.db("grocery").collection("products");
    const orderCollection = client.db("grocery").collection("orders");

    //add product
    app.post('/addProduct', (req, res) => {
        const newProduct = req.body;
        productCollection.insertOne(newProduct)
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    })

    //get products
    app.get('/products', (req, res) => {
        productCollection.find({})
            .toArray((err, items) => {
                res.send(items)
            })
    })

    //get a product
    app.get('/checkout/product/:id', (req, res) => {
        productCollection.find({ id: (req.params.id) })
            .toArray((err, documents) => {
                res.send(documents[0]);
            })
    })

    //delete product
    app.delete('/delete/:id', (req, res) => {
        productCollection.deleteOne({ _id: ObjectId(req.params.id) })
            .then(result => {
                res.send('deleted count: ', result.deletedCount > 0);
            })
    })

    //add orders
    app.post('/addOrder', (req, res) => {
        const newOrder = req.body;
        orderCollection.insertOne(newOrder)
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    })

    //get order & authorization of email
    app.get('/order', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
                .then((decodedToken)=> {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    if (tokenEmail == queryEmail) {
                        orderCollection.find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.status(200).send(documents);
                            })
                    }
                    else {
                        res.status(401).send('unauthorized access!!')
                    }
                })
                .catch((error)=> {
                    res.status(401).send('unauthorized access!!')
                });
        }
        else {
            res.status(401).send('unauthorized access!!')
        }
    })

    //get order List
    app.get('/orderList', (req, res) => {
        orderCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    //delete order
    app.delete('/delete/:id', (req, res) => {
        console.log(req.params.id)
        orderCollection.deleteOne({ _id: ObjectId(req.params.id) })
            .then(result => {
                res.send('deleted count: ', result.deletedCount > 0);
            })
    })
});

// connection check
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(process.env.PORT || port)