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
    console.log(user);
    next();  // pass the execution off to whatever request the client intended
  });
}


app.get('/login',(req,res)=>{
  res.render('./main.ejs')
})

app.get('/lobby',authenticateToken,(req,res,)=>{
  // console.log(req.query.token);
    res.render('./lobby.ejs', { data: '' });
})

app.post('/submit', async (req, res) => {
  const { username, password, email } = req.body;
  console.log(username,email);
  // try {
  //   const hashedPassword = await bcrypt.hash(password, 10);

  //   pool.query(
  //     'INSERT INTO users (username, password, email, Roles) VALUES (?, ?, ?, "User")',
  //     [username, hashedPassword, email], 
  //     (error, results) => {
  //       if (error) {
  //         console.error(error);
  //         res.status(500).send('Server error');
  //       } else {
  //         res.send('User added successfully');
  //       }
  //     }
  //   );
  // } catch {
  //   res.status(500).send('Server error');
  // }
  // res.redirect('/login')
});

app.post('/login',(req, res,next) => {
  const { username, password } = req.body;
  pool.query('SELECT * FROM users WHERE username = ?', [username], async (error, results) => {
    if (error) {
      console.log(error);
      res.status(500).send('Server error');
    } else if (results.length > 0) {
      const comparison = await bcrypt.compare(password, results[0].password);
      if (comparison) {
        // res.send('Logged in');
        const token = jwt.sign({ username: username, email: results[0].email, role: results[0].role}, process.env.JWT_SECRET);
        console.log("jwt: ",token);
         res.cookie('token', token, { httpOnly: true });
        res.redirect(`/lobby`);
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

// app.use('/lobby/url',authenticateToken,routerr);
app.post(`/lobby/chat`, authenticateToken,(req,res)=>{
 const  msgs = req.body.msg;
 console.log(msgs);
const data = { 

  username: `User => ${req.user.username} Sent you `, // Use template literal for string interpolation
  message: msgs 
};
 res.render('./lobby.ejs', {data}) // Pass rr to EJS template
 // res.json(msgs);
 // res.json(msgs);
 // pool.query("INSERT INTO users (msgss) VALUES (?))",
 //  [msgs],
 //      (error, results) => {
 //      console.log(msgs);
 //  });



})
const PORT = 3000
app.listen(PORT, () => console.log(`Server started: http://localhost:${PORT}/`))
export default pool;

