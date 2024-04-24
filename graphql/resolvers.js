const User = require("../models/user");
const Post = require("../models/post");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");

module.exports = {
    createUser: async function ({ userInput }, req) {
        // const email = args.userInput.email;
        const errors = [];
        if (!validator.isEmail(userInput.email)) {
            errors.push({ email: "Please provide a valid email address." });
        }
        if (
            !validator.isEmpty(userInput.password) ||
            !validator.isLength(userInput.password, { min: 6 })
        ) {
            errors.push({ password: "Password too short" });
        }
        if (errors.length > 0) {
            const error = new Error("Invalid input");
            error.data = errors;
            error.code = 422;
            throw error;
        }
        const existingUser = await User.findOne({ email: userInput.email });
        if (existingUser) {
            throw new Error("Email is already in use");
        }

        const hashedPassword = await bcrypt.hash(userInput.password, 12);
        const user = new User({
            name: userInput.name,
            email: userInput.email,
            password: hashedPassword,
            status: "",
        });
        const createdUser = await user.save();
        return { ...createdUser._doc, _id: createdUser._id.toString() };
    },

    login: async function ({ email, password }) {
        const user = await User.findOne({ email: email });
        if (!user) {
            throw new Error("User not found");
        }
        const doMatch = await bcrypt.compare(password, user.password);
        if (!doMatch) {
            throw new Error("Incorrect Password");
        }
        const token = jwt.sign(
            {
                email: user.email,
                userId: user._id.toString(),
            },
            "somesupersecret",
            { expiresIn: "1h" }
        );
        return { userId: user._id.toString(), token: token };
    },
    createPost: async function ({ postInput }, req) {
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!");
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("invalid user!");
            error.code = 401;
            throw error;
        }

        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user,
        });

        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();

        return {
            ...createdPost._doc,
            _id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString(),
        };
    },
    posts: async function (args, req) {
        const page =  args.page || 1;
        const perPage = 2;
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!");
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("invalid user!");
            error.code = 401;
            throw error;
        }

        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find()
            .skip((page - 1) * perPage)
            .limit(perPage)
            .sort({ createdAt: -1 })
            .populate("creator");
        return {
            posts: posts.map((post) => {
                return {
                    ...post._doc,
                    _id: post._id.toString(),
                    createdAt: post.createdAt.toISOString(),
                    updatedAt: post.updatedAt.toISOString(),
                };
            }),
            totalPosts: totalPosts,
        };
    },
    post: async function ({id}, req) {
        const post = await Post.findById(id).populate('creator');
        
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!");
            error.code = 401;
            throw error;
        }

        if(!post) {
            throw new Error(`Post not found!`);
        }

        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(), 
        }
    },
    updatePost: async function ({ postId,postInput }, req) {
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!");
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("invalid user!");
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(postId).populate('creator');
        
        if(!post) {
            throw new Error(`Post not found!`);
        }

        if(post.creator._id.toString() !== req.userId.toString()) {
            throw new Error(`Not Auth!`);
        }

        post.title = postInput.title;
        post.content = postInput.content;
        if(postInput.imageUrl !== 'undefined'){
            post.imageUrl = postInput.imageUrl; 
        } 
        const updatedPost = await post.save(); 

        return {
            ...updatedPost._doc,
            _id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString(),
        };
    },
    deletePost: async function ({ postId }, req) {
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!");
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("invalid user!");
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(postId);
        
        if(!post) {
            throw new Error(`Post not found!`);
        }

        if(post.creator._id.toString() !== req.userId.toString()) {
            throw new Error(`Not Auth!`);
        }

        await Post.findByIdAndDelete({_id : postId});
        user.posts.pull(postId);
        await user.save();

        return true; 
    },
};
