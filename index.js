const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = 5000 || process.env.PORT;
const app = express();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)


app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];  
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
      }
      req.decoded = decoded;
      next();
    })
  }




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mh16alw.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const usersCollection = client.db('music_hub').collection('users');
        const classCollection = client.db('music_hub').collection('classes');


        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      
            res.send({ token })
        })

        /* =============================================================================================================
        Getting All Data Started
        ================================================================================================================*/
        app.get('/all-data', async (req,res)=>{
            let userQuery = {role: "instructor"};
            let classQuery = {};
            if(req.query.useremail){
                userQuery = {
                    email: req.query.useremail
                }
            }
            if(req.query.email){
                userQuery = {
                    email: req.query.email
                }
            }
            const users = await usersCollection.find(userQuery).toArray();
            const classes = await classCollection.find(classQuery).toArray();
            res.send({users: users, classes: classes});
        });
        /* =============================================================================================================
        Getting All Data Ended
        ================================================================================================================*/
        /* =============================================================================================================
        Users Started
        ================================================================================================================*/
        app.get('/users',async (req,res)=>{
            let query = {};
            if(req.query.email){
                query = {
                    email: req.query.email
                }
                
            }
            // const decodedEmail = req.decoded.email;
            // if (email !== decodedEmail) {
            //   return res.status(403).send({ error: true, message: 'forbidden access' })
            // }

            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });
        app.post('/user', async (req, res) => {
            const body = req.body;
            const result = await usersCollection.insertOne(body);
            res.send(result);
        });
        app.put('/update-user-role', async(req, res)=> {
            const body = req.body;
            const options = {upsert: true};
            const id = body.id;
            const filter = {_id: new ObjectId(id)};
            const updateDoc ={
                $set:{
                    role: body.role
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);

        })
        app.put('/select-class', async(req, res)=> {
            const body = req.body;
            const options = {upsert: true};
            const query = body.query;
            const filter = {email: query};
            const user = await usersCollection.find(filter).toArray();
            console.log(user[0].selectedClass);
            const updateDoc ={
                $set:{
                    selectedClass: [...user[0].selectedClass, body.classID]
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);

        })
        /* =============================================================================================================
        Users end
        ================================================================================================================*/
        /* =============================================================================================================
        Class Started     .....
        ================================================================================================================*/
        app.get('/classes',async (req,res)=>{
            let query = {};
            if(req.query.instructorEmail){
                query = {
                    instructorEmail: req.query.instructorEmail
                }
            }
            const classes = await classCollection.find(query).toArray();
            res.send(classes);
        });
        app.post('/class', async (req, res) => {
            const body = req.body;
            
            const result = await classCollection.insertOne(body);
            res.send(result);
        });
        app.put('/manage-class', async(req, res)=> {
            const body = req.body;
            const options = {upsert: true};
            const id = body.id;
            const filter = {_id: new ObjectId(id)};
            const updateDoc ={
                $set:{
                    status: body.status,
                    feedback: body.feedback
                }
            }
            const result = await classCollection.updateOne(filter, updateDoc, options);
            res.send(result);

        });

        app.get('/selected-classes', async (req, res) => {
            let query = {};
            if (req.query.email) {
              query = {
                email: req.query.email
              };
            }
            const users = await usersCollection.find(query).toArray();
            const allClasses = await classCollection.find({}).toArray();
            const selectedClasses = users[0].selectedClass;
            const classes = allClasses.filter(aClass => {
                return selectedClasses.includes(aClass._id.toString());
              });
            res.send(classes);
          });

        /* =============================================================================================================
        Class ended
        ================================================================================================================*/


 /* =============================================================================================================
        PAyment start
        ================================================================================================================*/

        //  // payment related api
        //  app.post('/create-payment-intent', verifyJWT, async (req, res) => {
        //     const { price } = req.body;
        //     const amount = parseInt(price * 100);
        //     const paymentIntent = await stripe.paymentIntents.create({
        //       amount: amount,
        //       currency: 'usd',
        //       payment_method_types: ['card']
        //     });
      
        //     res.send({
        //       clientSecret: paymentIntent.client_secret
        //     })
        //   })

           /* =============================================================================================================
        payment ended
        ================================================================================================================*/





        app.get('/', (req,res) => {
            res.send('Music Hub is running');
        });
    }
    finally{

    }

}
run().catch(console.log);


app.listen(port, () => {
    console.log(`App is running on port: ${port}`);
})