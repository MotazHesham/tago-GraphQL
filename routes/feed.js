const express= require('express');
const feedController = require('../controllers/feedController');
const {body} = require('express-validator');
const isAuth =  require('../middelware/is-auth');

const router = express.Router();

router.get('/posts',isAuth,feedController.getPosts);
router.get('/post/:postId',isAuth,feedController.getPost);
router.put('/post/:postId',isAuth,feedController.updatePost);
router.delete('/post/:postId',isAuth,feedController.deletePost);
router.post('/posts-create',isAuth,[body('title').trim().isLength({min:5})],feedController.postPosts);

module.exports = router;