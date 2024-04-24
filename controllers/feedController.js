const { validationResult } = require("express-validator");
const Post = require("../models/post");
const User = require("../models/user");
const fileHelper = require("../util/file");

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .skip((currentPage - 1) * perPage)
            .limit(perPage);
        res.status(200).json({
            message: "Fetched posts Success!!",
            posts: posts,
            pagination: {
                currentPage: Number(currentPage),
                totalItems: totalItems,
                totalPages: Math.ceil(totalItems / perPage)
            }
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postPosts = async (req, res, next) => {
    const title = req.body.title;
    const content = req.body.content;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error("Validation failed");
        error.statusCode = 422;
        error.validations = errors.array();
        throw error;
    }

    if (!req.file) {
        const error = new Error("Missing image");
        error.statusCode = 422;
        throw error;
    }
    const post = new Post({
        title: title,
        content: content,
        imageUrl: req.file.path,
        creator: req.userId
    });

    try {
        await post.save();
        const user = await User.findById(req.userId);
        user.posts.push(post);
        await user.save();

        res.status(201).json({
            message: "Post created successfully!",
            post: post,
            creator: { _id: user._id, name: user.name }
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId);

        if (!post) {
            const error = new Error("Could not find post for this id");
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            message: "Post fetched",
            post: post
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = null;
    if (req.file) {
        imageUrl = req.file.path;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error("Validation failed");
        error.statusCode = 422;
        error.validations = errors.array();
        throw error;
    }
    try {
        const post = await Post.findById({ _id: postId });
        if (!post) {
            const error = new Error("Post Not Found");
            error.statusCode = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId.toString()) {
            const error = new Error("Not authorized");
            error.statusCode = 403;
            throw error;
        }
        post.title = title || post.imageUrl;
        post.content = content || post.content;
        post.imageUrl = imageUrl || post.imageUrl;
        await post.save();
        res.status(200).json({
            message: "Post Updated",
            post: post
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById({ _id: postId });
        if (!post) {
            const error = new Error("Post Not Found");
            error.statusCode = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId.toString()) {
            const error = new Error("Not authorized");
            error.statusCode = 403;
            throw error;
        }

        await Post.findByIdAndDelete({ _id: postId });
        fileHelper.deleteFile(post.imageUrl);
        const user = await User.findById(req.userId);
        user.posts.pull(postId);
        await user.save();
        res.status(200).json({
            message: "Post deleted"
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
