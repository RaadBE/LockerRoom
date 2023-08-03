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
      'INSERT INTO users (username, password, email, Roles) VALUES (?, ?, ?, "User")',
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
  pool.query('SELECT * FROM users WHERE username = ?', [username], async (error, results) => {
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
    'SELECT message FROM USERS.messages;',
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

// app.use('/lobby/url',authenticateToken,routerr);
// app.post(`/lobby/chat`, authenticateToken,(req,res)=>{
//  const  msgs = req.body.msg;
//  // console.log(msgs);
// const data = { 
//   username: `${req.user.username} :  `,
//   message: msgs 
// };
// const user_id = req.user.id;
//     var lobby_id = req.body.lobby_id;  // Extract lobby ID from request body
//      const lobby_id = req.body.lobby_id; 
//     console.log('hey :',lobby_id,user_id);
//     pool.query(
//         "INSERT INTO messagess (user_id, lobby_id, message) VALUES (?, ?, ?)",
//         [user_id, lobby_id, msgs],
//         (error, results) => {
//             if (error) {
//                 console.log(error);
//                 res.status(500).send('Server error');
//             } else {
//         res.redirect(`/lobby/${lobby.name}/${lobby.id}/chat`);
//             }
//         }
//     );
// })


app.post(`/lobby/chat`, authenticateToken,(req,res)=>{
 const  msgs = req.body.msg;
 const data = { 
   username: `${req.user.username} :  `,
   message: msgs 
 };
 const user_id = req.user.id;
 const lobby_id = req.body.lobby_id;  
 const lobby_name = req.body.lobby_name;  
 console.log('hey :',lobby_id,user_id);
 pool.query(
     "INSERT INTO messagess (user_id, lobby_id, message) VALUES (?, ?, ?)",
     [user_id, lobby_id, msgs],
     (error, results) => {
         if (error) {
             console.log(error);
             res.status(500).send('Server error');
         } else {
             //Fetch lobby details for the redirect
             pool.query(
                 "SELECT * FROM lobbies WHERE id = ?",
                 [lobby_id],
                 (error, results) => {
                     if (error) {
                         console.log(error);
                         res.status(500).send('Server error');
                     } else {
                         const lobby = results[0]; //Assuming that lobby id is unique
                         res.redirect(`/lobby/${lobby_name}/${lobby_id}/chat`);
                     }
                 }
             );
         }
     }
 );
})







app.post('/lobby/create', authenticateToken, (req, res) => {
  const name = req.body.name;
  const admin_id = req.user.id;
   // Extract user id from request
    const lobby_name = req.params.name; // Extract lobby name from request parameters

   var lobby_id = req.body.lobby_id;
  pool.query(
    'INSERT INTO lobbiess (name, admin_id) VALUES (?, ?)', 
    [name, admin_id],
    (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('Server error');
      } else {
          const lobby = { id: results.insertId, name: name, admin: admin_id };
          console.log(lobby)
        // Now lobby contains the id of the newly created lobby, its name and the id of its creator
        res.redirect(`/lobby/${lobby.name}/${lobby.id}/chat`);
      }
    }
  );
});
app.get('/lobby/:name/:id/chat', authenticateToken, (req, res) => {
  const user_id = req.user.id;
  const lobby_name = req.params.name;

  pool.query(
    'SELECT id FROM lobbiess WHERE admin_id = ?',
    [lobby_name],
    (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('Server error');
      } else {
        if(results.length > 0){
            const lobby_id = results[0].id;

            pool.query(
              'SELECT username, message FROM messagess WHERE lobby_id = ?',
              [lobby_id],
              (error, results) => {
                if (error) {
                  console.error(error);
                  res.status(500).send('Server error');
                } else {
                  const messages = results.map(message => ({
                    username: message.username,
                    message: message.message
                  }));

                  res.render('./lobby.ejs', {messages: messages, lobby_id: lobby_id });
                }
              }
            );
        } else {
            res.status(404).send('Lobby not found');
        }
      }
    }
  );
});
``


// app.get('/lobby/:name/:id/chat', authenticateToken, (req, res) => {
//   const user_id = req.user.id;
//   const lobby_name = req.params.name; // Extract lobby name from request parameters
//   // Perform a SELECT query to get the id of the lobby with the given name
//   pool.query(
//     'SELECT id FROM lobbiess WHERE name = ?',
//     [lobby_name],
//     (error, results) => {
//       if (error) {
//         console.error(error);
//         res.status(500).send('Server error');
//       } else {
//         const lobby_id = results[0].id; // Extract the id of the lobby

//         // Now perform a SELECT query to get all messages from the lobby
//         pool.query(
//           'SELECT message FROM messagess WHERE lobby_id = ?',
//           [lobby_id],
//           (error, results) => {
//             if (error) {
//               console.error(error);
//               res.status(500).send('Server error');
//             } else {
//               const messages = results.map(message => ({
//                 username: username,
//                 message: message.message
//               }));

//               res.render('./lobby.ejs', {messages: messages, lobby_id: lobby_id });
//             }
//           }
//         );
//       }
//     }
//   );
// });



// app.post('/lobby/create', authenticateToken, (req, res) => {
//   const name = req.body.name;
//   pool.query(
//     'INSERT INTO lobbies (name) VALUES (?)',
//     [name], 
//     (error, results) => {
//       if (error) {
//         console.error(error);
//         res.status(500).send('Server error');
//       } else {
//         res.send({ id: results.insertId, name: name });
//       }
//     }
//   );
// });

// app.get('/lobby/chat', authenticateToken, (req, res) => {
//   // Get the user_id from the authenticated user
//   const user_id = req.user.id;
  
//   // Perform a SELECT query to get all messages
//   pool.query(
//     'SELECT * FROM messages',
//     (error, results) => {
//       if (error) {
//         console.error(error);
//         res.status(500).send('Server error');
//       } else {
//       const messages = results; // Extract the rows from the results object
//         res.render('./lobby.ejs', {messages: msgs });
//       }
//     }
//   );
// });

// app.post(`/lobby/chat`, authenticateToken, async(req,res)=>{
//       console.log('saa',req.user);  // This should log your user object
//     // const msgs = req.body.msg;
//     // const user_id = req.user.id;
//     // var lobby_id = req.body.lobby_id;  // Extract lobby ID from request body
//     // console.log('hey :',msgs,);



//     pool.query(
//         "INSERT INTO messages (user_id, lobby_id, message) VALUES (?, ?, ?)",
//         [user_id, lobby_id, msgs],
//         (error, results) => {
//             if (error) {
//                 console.log(error);
//                 res.status(500).send('Server error');
//             } else {
//                 res.render('./lobby.ejs', { rr: msgs }); // Pass rr to EJS template
//             }
//         }
//     );
// })
const PORT = 3000
app.listen(PORT, () => console.log(`Server started: http://localhost:${PORT}/`))
export default pool;




// route to get all users from a lobby.
// route to get all message from a lobby.
// route to get all message from a specfices user and a lobby or a lobby.
// route to get all lobbys.
// route to get all lobbys by user_id
// router to see al the lobbys by the role .
// find a way to install 