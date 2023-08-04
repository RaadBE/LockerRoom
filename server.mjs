import express from 'express';
import mysql  from 'mysql';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import routerr from './client/lobby/lobbyRouter.mjs'

dotenv.config({
    path: './.env'
});
dotenv.config();
const app = express();
app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());




app.set('view engine', 'ejs');
app.use(express.json()); // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true }));

const dbname = process.env.dbname
const dbHost = process.env.host
const dbUser = process.env.user
const dbPass = process.env.password

const pool = mysql.createPool({
  connectionLimit : 10, // default = 10
  database       :dbname,
  host           :dbHost,
  user            : dbUser,
  password        : dbPass
});

pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.')
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.')
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused.')
    }
  }

  if (connection) connection.release();

  return;
});

function authenticateToken(req, res, next) {
      // console.log('Token is :', req.query.token);  // Here you log the token after it's verified
  // const authHeader = req.headers['authorization'];
  // const token = authHeader && authHeader.split(' ')[1];
  const token = req.cookies.token;


  if (token == null) return res.sendStatus(401);  // if there isn't any token

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    console.log('Token is verified and it is:', req.cookies.token);  // Here you log the token after it's verified
    req.user = user;
    console.log(req.user);
    next();  // pass the execution off to whatever request the client intended
  });
}


app.get('/login',(req,res)=>{
  res.render('./main.ejs')
})

app.get('/lobby',authenticateToken,(req,res,)=>{
  // console.log(req.query.token);
        res.render('./lobby.ejs', { data: '', messages: '' });
})

app.post('/submit', async (req, res) => {
  const { username, password, email } = req.body;
  console.log(username,email);
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    pool.query(
      'INSERT INTO chatuserss (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email], 
      (error, results) => {
        if (error) {
          console.error(error);
          res.status(500).send('Server error');
        } else {
          res.send('User added successfully');
        }
      }
    );
  } catch {
    res.status(500).send('Server error');
  }
  res.redirect('/login')
});

app.post('/login',(req, res,next) => {
  const { username, password } = req.body;
  pool.query('SELECT * FROM chatuserss WHERE username = ?', [username], async (error, results) => {
    if (error) {
      console.log(error);
      res.status(500).send('Server error');
    } else if (results.length > 0) {
      const comparison = await bcrypt.compare(password, results[0].password);
      if (comparison) {
        // res.send('Logged in');
        const token = jwt.sign({ id: results[0].id, username: username, email: results[0].email, Role: results[0].Role}, process.env.JWT_SECRET);
        console.log("jwt: ",token);
         res.cookie('token', token, { httpOnly: true });
        res.redirect(`/lobby/chat`);
        next();
        // res.redirect('/lobby')
       // res.redirect(`lobby/url?token=${token}`);
      } else {
        res.send('Wrong password.');
      }
    } else {
      res.send('Wrong username.');
    }
  });
});
app.get('/lobby/chat', authenticateToken, (req, res) => {
  // Get the user_id from the authenticated user
  const user_id = req.user.id;
    const username = req.user.username;
  
  // Perform a SELECT query to get all messages
  pool.query(
    'SELECT message FROM chatmessages;',
    (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('Server error');
      } else {
         const messages = results.map(message => ({
          username: username,
          message: message.message
        }));

        res.render('./lobby.ejs', {messages: messages });
      }
    }
  );
});
// app.post(`/lobby/:name/:lobby_id/room/chat`, authenticateToken, (req, res) => {
//   const msgs = req.body.msg;
//   const user_id = req.user.id;
//   const lobby_id = req.params.lobby_id;  // Extract lobby ID from request params, not body
//   const lobby_name = req.params.name; // Extract lobby name from request params
//   console.log('this is the time',lobby_id,'user also',user_id)
//     pool.query(
//       "INSERT INTO chatmessages (user_id, lobby_id, message) VALUES (?, ?, ?)",
//       [user_id, lobby_id, msgs],
//       (error, results) => {
//         if (error) {
//           console.error(error);
//           res.status(500).send('Server error');
//         } else {
//             // Redirect after the message has been inserted successfully
//             res.redirect(`/lobby/${lobby_name}/${lobby_id}/room/chat`);
//         }
//       }
//     );
// });
app.post(`/lobby/:name/:lobby_id/room/chat`, authenticateToken, (req, res) => {
  const msgs = req.body.msg;
  const user_id = req.user.id;
  const lobby_id = req.params.lobby_id;
  const lobby_name = req.params.name; 

  pool.query(
      "INSERT INTO chatmessages (user_id, lobby_id, message) VALUES (?, ?, ?)",
      [user_id, lobby_id, msgs],
      (error, results) => {
        if (error) {
          console.error(error);
          res.status(500).send('Server error');
        } else {
            res.redirect(`/lobby/${lobby_name}/${lobby_id}/room/chat`);
        }
      }
    );
});


app.post('/lobby/create', authenticateToken, (req, res) => {
  // const name = req.body.name;
  // const user_id = req.body.user_id;
  // const admin_id = req.user.id;
  // const lobby_id = req.params.lobby_id;  // extract lobby_id from URL parameters
    const name = req.body.name;
  const admin_id = req.user.id;
  pool.query(
    'INSERT INTO chatlobbiess (name ,admin_id) VALUES (?,?)',
    [name,admin_id], 
    (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('Server error');
      } else {
        const lobby_id = results.insertId;  // Define lobby_id here, after results is available
        console.log('hey',lobby_id);
        // res.send({ id: results.insertId, name: name,admin_id: admin_id });
        res.redirect(`/lobby/${name}/${lobby_id}/room/chat`)
      }
    }
  );
});

app.get('/lobby/:name/:lobby_id/room/chat', authenticateToken, (req, res) => {
  const  msgs = req.body.msg;
  const admin_id = req.user.id;
    const lobby_id = req.params.lobby_id;  // extract lobby_id from URL parameters
  const name = req.params.name; // name is also a URL parameter, not body
  const user_id = req.user.id;
  res.render('./lobbyRoom.ejs', {name: name, lobby_id: lobby_id, messages: msgs});
  });
const PORT = 3000

app.listen(PORT, () => console.log(`Server started: http://localhost:${PORT}/`))
export default pool;


