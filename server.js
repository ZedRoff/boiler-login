const express = require("express")
const cookieParser = require("cookie-parser")
const app = express()
const cors = require("cors")
const sqlite = require("better-sqlite3");
const db = sqlite("foobar.db")
const bcrypt = require("bcrypt")
const crypto = require("crypto")
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cors({credentials:true}))
app.use(cookieParser())
app.use(express.static('public'))
db.pragma('journal_mode = WAL');
const stmt = db.prepare(`CREATE TABLE if not exists user(
    username TEXT,
    password TEXT
);`);
stmt.run()
app.listen(3000, () => {
    console.log("App is Ready !")
})
const setCookie = (name, description, code, path, res) => {
    res.cookie(name,description)
    return res.status(code).redirect(path)
}
let sessions = new Map()
app.get("/", async (req, res) => {

    res.redirect("/login")
   
})
app.get("/login", async (req, res) => {
  
   if(sessions.has(req.cookies.sessionId)) {
        return res.redirect("/home")
   }
   
    return res.sendFile(__dirname + "/login.html")
})
app.get("/signup", (req, res) => {
    if(sessions.has(req.cookies.sessionId)) {
        
        return res.redirect("/home")
   }
  
    return res.sendFile(__dirname + "/signup.html")
})
app.get("/username", (req, res) => {
    if(sessions.has(req.cookies.sessionId)) {
        return res.json({message: sessions.get(req.cookies.sessionId)})
    }
    return res.status(401).send("Connect again")
})
app.post("/login_req", async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
   let getter = db.prepare(`SELECT username, password FROM user WHERE user.username='${username}';`).get();
   if(getter == undefined) {
    return setCookie("error", "Wrong credentials", 404, "/login", res)
  
   }
   if(await bcrypt.compare(password, getter.password)) {
    let sessionId = crypto.randomUUID()
    res.cookie("sessionId", sessionId, {
        secure: true,
        httpOnly:true,
        sameSite:"strict"
    })
    sessions.set(sessionId, username)

        return res.status(200).redirect("/home")
   } else {
    return setCookie("error", "Wrong credentials", 401, "/login", res)
  

   
   }
})
app.post("/signup_req", async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    let getter = db.prepare(`SELECT username FROM user WHERE user.username='${username}';`).get();
  
    if(getter != undefined) {
        return setCookie("error", "Already exists", 409, "/signup", res)
  
    }
    let hashedPassword = await bcrypt.hash(password, 10);
    const stmt2 = db.prepare(`INSERT INTO user VALUES('${username}', '${hashedPassword}');`);
    stmt2.run()

    let sessionId = crypto.randomUUID()
    res.cookie("sessionId", sessionId, {
        secure: true,
        httpOnly:true,
        sameSite:"strict"
    })
    sessions.set(sessionId, username)

    return res.status(201).redirect("/home")
   
})
app.get("/home", (req, res) => {
    if(!sessions.has(req.cookies.sessionId)) {
        res.cookie("error", "You have to login first")
        return res.redirect("/login")
    }
   
    return res.sendFile(__dirname + "/homepage.html")
})

app.post("/logout", (req, res) => {
    sessions.delete(req.cookies.sessionId);
    res.clearCookie("sessionId")
    res.cookie("error", "")
    return res.status(200).json({message: "Success"})
})