import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";


const app = express();
const port = 3000;
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Book_Notes_Project",
    password: "flam1ngb0Y",
    port: 5432,
  });

db.connect();

let currentOrder = 'Recent';
let defaultImageBin;

try{
    defaultImageBin = await fs.promises.readFile('./public/images/question-mark.jpg');
} catch(err){
    console.log(err);
}


//console.log(defaultImageBin);


app.use(express.static("./public"));
app.use(bodyParser.urlencoded({ extended: true }));

async function fetchImage(url){
    try{ 
        console.log(url);
        const response = await axios.get(url, {responseType: 'arraybuffer'});
        //an error is thrown when the arraybuffer is not defined
        
        if(response.data.bytelength != 0){
            console.log("image received");
            return Buffer.from(response.data); //if arraybuffer sent over is empty, give the default ImageBuffer
        } else{
            return defaultImageBin;
        }
    } catch(err){
        
        console.error(err, "returning");
        console.log("image not received");
        return defaultImageBin;
    }
}

async function getBooks(){
    try{
        let criteria;
        if(currentOrder == "Recent"){
            criteria = "id";
        } else{
            criteria = "rating"
        }

        const response = await db.query(`SELECT id, title, rating, cover_picture, TO_CHAR(date_added, 'DD-MM-YYYY') AS date_added FROM book_titles ORDER BY ${criteria} DESC`);
        return response.rows;
    } catch(err){
        console.error(err);
    }
}

async function getDetails(id){
    try {
        const response = await db.query(`SELECT book_titles.id, book_titles.title, book_titles.rating, book_titles.cover_picture, book_info.author, book_info.description FROM book_titles JOIN book_info ON book_titles.id=book_info.book_id WHERE book_titles.id=${id}`)
        return response.rows[0];
    } catch (err) {
        console.error(err);
    }
}

async function getNotes(id){
    try {
        const response = await db.query(`SELECT id, notes AS content FROM book_notes WHERE book_id = ${id} ORDER BY id`);
        return response.rows;
    } catch (err) {
        console.error(err);
    }
}

app.get("/", async (req, res) => {
    const books = await getBooks();
    res.render("index.ejs", {
        books: books,
        order: currentOrder
    });
});

app.post("/order", (req, res) => {
    const order = req.body.criteria;
    currentOrder = order;
    res.redirect("/");
});

app.get("/newBook", (req, res) => {
    res.render("addBook.ejs");
});

app.post("/addBook", async(req, res) => {
    const title = req.body.title.trim();
    const description = req.body.description.trim();
    const author = req.body.author.trim();
    const rating = req.body.rating.trim();
    const date = req.body.date.trim();
    const isbn = req.body.ISBN.trim();
    
    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`

    //fetching the binary data from the open library API and storing it in this imageBuffer

    const imageBuffer = await fetchImage(url);

    // if (!imageBuffer || imageBuffer.length === 0) {
    //     imageBuffer = defaultImageBin;
    // }
    
    console.log("imageBuffer", imageBuffer);
    try {
        let result;
        if(date){
            result = await db.query("INSERT INTO book_titles (title, rating, cover_picture, date_added) VALUES($1, $2, $3, $4) RETURNING *", [title, rating, imageBuffer, date]);
        } else{
            result = await db.query("INSERT INTO book_titles (title, rating, cover_picture) VALUES($1, $2, $3) RETURNING *", [title, rating, imageBuffer]);
        }
        
        console.log(result.rows);
        const id = result.rows[0].id;

        try {
            const response = await db.query("INSERT INTO book_info (book_id, author, description) VALUES ($1, $2, $3) RETURNING *", [id, author, description]);
            console.log(response.rows)
            res.redirect("/")
        } catch (error) {
            console.error(err);
        }
        
    } catch (err) {
        console.error(err);
        if(err.code == '23505'){
            res.render("addBook.ejs", {
                error: "Book already added"
            })
        }
    }
    
    
});

app.get("/view/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    console.log(id);
    const bookDetails = await getDetails(id);
    const noteList = await getNotes(id);
    // console.log(bookDetails);
    // console.log(noteList);
    res.render("viewBook.ejs", {
        bookDetails: bookDetails,
        notelist: noteList
    })
})

app.post("/newNote", (req, res) => {
    const book_id = req.body.id;
    const title = req.body.title;
    console.log(title, book_id);
    res.render("addNote.ejs", {
        book_id: book_id,
        title: title
    });
})

app.post("/addNote", async (req, res) => {
    const book_id = req.body.book_id;
    const newNote = req.body.note.trim();
    if(newNote){
        try{
            const response = await db.query("INSERT INTO book_notes (book_id, notes) VALUES($1, $2) RETURNING *",[book_id, newNote]);
            console.log("Inserted:", response.rows);
            res.redirect(`/view/${book_id}`);
        } catch(err){
            console.error(err);
        }


    } else{
        res.render("addNote.ejs", {
            book_id: book_id,
            title: title,
            error: "New note cannot be empty"
        });
    }
});

//can add in a delete button for the notes
//yet to do the functioanlity for edit notes and description yet
app.post("/edit", (req, res) => {
    const type = req.body.type;
    const content = req.body.content;
    const title = req.body.title;
    const book_id = req.body.book_id;
    console.log("book_id", book_id)
    if(type == "description"){

        res.render("edit.ejs", {
            book_id: book_id,
            title: title,
            content: content,
            type: type
        })  
    } else{
        const note_id = req.body.note_id;
        res.render("edit.ejs", {
            book_id: book_id,
            note_id: note_id,
            title: title,
            content: content,
            type: type
        })  
    }
});


app.post("/editDone", async (req, res) => {
    const type = req.body.type;
    const content = req.body.content;
    const book_id = req.body.book_id;
    console.log("book_id", book_id)
    if(content.length > 0){
        if(type == "description"){
            try{
                const response = await db.query("UPDATE book_info SET description=$1 WHERE book_id = $2 RETURNING *", [content, book_id])
                console.log("Updated: ", response.rows)
            } catch(err){
                console.error("Updated: ", err);
            }
        } else{
            const note_id = req.body.note_id;
            try{
                const response = await db.query("UPDATE book_notes SET notes=$1 WHERE id = $2 RETURNING *", [content, note_id])
                console.log(response.rows)
            } catch(err){
                console.error(err);
            }
        }
    } 
    res.redirect(`/view/${book_id}`);
})

app.post("/deleteNote", async (req,res) => {
    const note_id = req.body.note_id;
    const book_id = req.body.book_id;
    try{
        const response = await db.query("DELETE FROM book_notes WHERE id = $1", [note_id])
        console.log("Deleted: ", response.rows);
    } catch(err){
        console.error(err);
    }
    res.redirect(`/view/${book_id}`);
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});