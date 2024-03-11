To use this programme: 
- Download all the dependencies using `npm i` 
- Then start the server by running `nodemon index.js`, server will be on localhost:3000

Usage tips:
- There is no option to delete books that are already added
- When adding in books, a description is required. If no date is provided, the default date recorded is the current date. Please follow the date format
- Option to add, edit and delete book notes are available. To access all those functions and view the book notes, click on the icons of the books in the front page. 
- When book is added, according to the ISBN keyed in, programme will automatically fetch an image of a book cover from the Open Library Book Cover API. If book cover not found by API, the book cover of the book-item will default to a default book cover picture (question-mark.jpg).