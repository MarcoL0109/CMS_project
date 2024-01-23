var express = require("express");
var path = require('path')
var mysql = require("./database")
var bycrpyt = require("bcrypt");
var sessions = require('express-session');
var cookie_parser = require("cookie-parser");
var nodemailer = require("nodemailer")
const e = require("express");
const { resolve } = require("path");
const { rejects } = require("assert");
const { count } = require("console");

var types = 0
var login_status = 1
var session;
var reset_type_error = 0
var request_error = 0
const oneDay = 1000 * 60 * 60 * 24
var incorrect_code = 0
let public_code = ''


const app = express()
app.use(express.static(path.join(__dirname, 'public')))
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(sessions({
    secret: "thisisasecretstringthatdoesnotallowtobeseen",
    resave: false,
    saveUninitialized: true,
    cookie: {maxAge: oneDay}
}))
app.use(cookie_parser())

var transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'marcolau733@gmail.com',
        pass: 'hccgktghwqmwasra'
    },
    from: 'marcolau733@gmail.com'
    
})


async function check_user(email) {
    const [result] = await mysql.query('select * from accounts.users where Email_Address = ?', [email])
    var is_here = false
    if (result.length > 0) {is_here = true}
    return is_here
}

async function add_user(email, username, password) {
    await mysql.query('insert into accounts.users values (?, ?, ?)', [email, username, password])
}


async function get_password(email) {
    const [result] = await mysql.query("select password from accounts.users where Email_Address = ?", [email])
    if (result.length > 0) return result[0].password
    return null;
}

async function generate_code() {
    var code = ''
    for (let i = 0; i < 6; i++) {
        var digit = Math.floor(Math.random() * 10)
        var string_form = digit + ''
        code += string_form
    }
    return code
}

async function send_email(transport, email, validation_code) {

    const [result] = await mysql.query('select User_name from accounts.users where Email_Address = ?', [email])
    const user_name = result[0].User_name

    const content = `Hi ${user_name}.\nYour code for restting your password is ${validation_code}\nPlease enter it within 3 minutes`

    var mailOptaion = {
        from: 'marcolau733@gmail.com',
        to: email,
        subject: 'Validation code for restting password',
        text: content
    }

    return new Promise((resolve, rejects) => {
        transport.sendMail(mailOptaion, function(error, info) {
            if (error) {
                console.log(error)
                resolve(false)
            }
            else {
                console.log("Email sent " + info.response)
                resolve(true)
            }
        }) 
    })
}



app.get('/', (req, res) => {
    if (req.session.userid) {
        req.session.destroy()
    }
    login_status = 1
    res.render('login.ejs', {data: login_status})
})

app.get('/login', (req, res) => {
    if (req.session.userid) {
        req.session.destroy()
    }
    login_status = 1
    res.render('login.ejs', {data: login_status})
})


app.get('/main_page', (req, res) => {
    session = req.session
    if (session.userid) {
        res.render('main_page.ejs')
    }
    else {
        res.redirect('/login')
    }
}) 

app.get('/forgot_password', (req, res) => {
    if (req.session.userid) {
        req.session.destroy()
    }
    types = 0
    res.render('forgot_password.ejs', {data: reset_type_error})
})

app.get('/register', (req, res) => {
    session = req.session;
    if (session.userid) {
        req.session.destroy()
    }
    res.render('regist.ejs', {data: types})
})

app.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/');
})

app.get('/validation', (req, res) => {
    if (public_code != '') {
        res.render('validate.ejs', {data: incorrect_code})
    }
    else {
        res.redirect('/forgot_password')
    }
})


app.post('/register', async (req, res) => {
    try {
        if (req.body.new_password != req.body.confirm_new_password) {
            types = 1
        }
        else {
            var email = req.body.email_address
            var username = req.body.username_input
            const result = await check_user(email)
            if (result == true) {
                types = 2             
            }
            else {
                const hashPassword = await bycrpyt.hash(req.body.new_password, 10)
                await add_user(email, username, hashPassword)
                types = 0
            }
        }
        if (types == 1 || types == 2) {
            res.render('regist', types)
        }
        else {
            res.redirect('/login')
        }
    } catch(e) {
        res.redirect('/register')
    }
})


app.post('/login', async (req, res) => {
    try {
        var input_email = req.body.username
        var input_password = req.body.password
        var password_correct = await get_password(input_email)

        session = req.session

        if ((password_correct == null) || (password_correct != null && !await bycrpyt.compare(input_password, password_correct))) {
            login_status = 0
            res.render('login.ejs', {data: login_status})
        }
        else {
            session.userid = req.body.username
            login_status = 1
            res.redirect('/main_page')
        }
    } catch(e) {
        console.log(e)
        res.redirect('/login')
    }
})


/*
To do

1. Make the count down clock
2. Create a ejs page for resetting the password
3. Apply the reset password post method

*/
app.post('/reset_password', async (req, res) => {

    try {
        var password = req.body.new_password
        var confirm_password = req.body.confirm_new_password

        if (password != confirm_password) {reset_type_error = 1}
        else {
            const new_hashed_password = await bycrpyt.hash(password, 10)
            await mysql.query('update accounts.users set password = ? where Email_Address = ?', [new_hashed_password, email])
        }
        res.redirect('/login')
    } catch (error) {
        console.log(error)
        res.redirect('/forgot_password')
    }
})

app.post('/send_code', async (req, res) => {

    try {
        var email = req.body.email_address
        var email_valid = await check_user(email)
        if (!email_valid) {
            request_error = 1
            res.render('forgot_password.ejs', {data: request_error})
        }
        else {
            var validation_code = await generate_code()
            public_code = validation_code
            var can_send = await send_email(transport, email, validation_code)
            // can_send = true
            if (can_send) {res.redirect('/validation')}
            else {res.redirect('/')}
        }
    } catch (e) {
        console.log(e)
        res.redirect('/login')
    }
})


app.post('/validation', async (req, res) => {



})



app.listen(8000);
