import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'
import mongoData from './mongoData.js'
import Pusher from "pusher";

//app config 
const app = express()
const port = process.env.PORT || 8080

const pusher = new Pusher({
    appId: "1181220",
    key: "ebae66201ca6619c5c51",
    secret: "00fd7ea9d0017148f9df",
    cluster: "eu",
    useTLS: true
  });
  

//middlewares
app.use(express.json())
app.use(cors())

//db config
const mongoURI = 'mongodb+srv://discord:discord@cluster0.nurgb.mongodb.net/discordDB?retryWrites=true&w=majority'

mongoose.connect(mongoURI, {
    useCreateIndex: true,
    useUnifiedTopology: true,
    useNewUrlParser: true 
})

mongoose.connection.once('open', () => {
    console.log('DB is connected')

    const changeStream = mongoose.connection.collection('conversations').watch()

    changeStream.on('change', (change) => {
        if(change.operationType === 'insert') {
            pusher.trigger('channels', 'newChannel', {
                'change': change
            })
        } else if (change.operationType === 'update') {
            pusher.trigger('conversation', 'newMessage', {
                'change': change
            })
        } else {
            console.log('Error triggering pusher')
        }
    })
})

//api routes
app.get('/', (req, res) => res.status(200).send('hello world'))

app.post('/new/channel', (req, res) => {
    console.log('received', req.body)
    const dbData = req.body

    mongoData.create(dbData, (err, data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.status(201).send(data)
        }
    })
})

app.get('/get/channelList', (req, res) => {
    mongoData.find((err, data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            let channels = []
            data.map(channelData => {
                const channelInfo = {
                    id: channelData.id,
                    name: channelData.channelName
                }
                channels.push(channelInfo)
            })

            res.status(201).send(channels)
        }
    })
})

app.get('/get/data', (req, res) => {
    mongoData.find((err, data) => {
        if(err){
            res.status(500).send(err)
        } else {
            res.status(200).send(data)
        }
    })
})

app.get('/get/conversation', (req, res) => {
    const id = req.query.id;

    mongoData.find({_id: id}, (err, data) => {
        if(err){
            res.status(500).send(err)
        } else {
            res.status(200).send(data)
        }
    })
})

app.post('/new/message', (req, res) => {

    const newMessage = req.body 

    mongoData.update(
        {_id: req.query.id},
        {$push: { conversation: req.body }},
        (err, data) => { 
            if(err) {
                console.log('Error saving message...')
                console.log(err)
                res.status(500).send(err)
            } else {
                res.status(201).send(data)
            }
        }
    )
})

//listener
app.listen(port, () => console.log(`Server is listening on ${port}`))