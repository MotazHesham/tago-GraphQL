// IMPORTS
const express = require("express");
const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const graphqlHTTP = require("express-graphql").graphqlHTTP;
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const auth = require("./middelware/auth");
const fileHlper = require("./util/file");
// ----------------------

// ENV VARIABLES
const MONGODB_URI =
    "mongodb+srv://node-user:fXWvXI3mf6m2Hxa7@atlascluster.phy2cln.mongodb.net/blog_graph?retryWrites=true&w=majority&appName=AtlasCluster";
// ----------------------

// CONFIGURATIONS
const app = express();
const fileStroage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "storage");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg"
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};
// ----------------------

// MIDDELWARES
app.use(bodyParser.json()); // application/json
// app.use(bodyParser.urlencoded({ extended: false })); // x-www-form-urlencoded <form>
app.use("/storage", express.static(path.join(__dirname, "storage")));
app.use(
    multer({ storage: fileStroage, fileFilter: fileFilter }).single("image")
);

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200); // this because express-graphql by default refuse  the OPTIONS method
    }
    next();
});

app.use(auth);

app.put("/post-image", (req, res, next) => {
    if (!req.isAuth) {
        const error = new Error("Not Authenticated!");
        error.code = 401;
        throw error;
    }

    if (!req.file) {
        return res.status(200).json({ message: "No File provided!" });
    }
    if (req.body.oldPath) {
        fileHlper.deleteFile(req.body.oldPath);
    }
    return res
        .status(201)
        .json({ message: "File stored.", filePath: req.file.path });
});

app.use(
    "/graphql",
    graphqlHTTP({
        schema: graphqlSchema,
        rootValue: graphqlResolver,
        graphiql: true,
        customFormatErrorFn(err) {
            console.log(err);
            if (!err.originalError) {
                // that mean error throw by me or third party package
                return err;
            }
            const data = err.originalError.data;
            const code = err.originalError.code || 500;
            const message = err.message || "An error occured";
            return { message: message, status: code, data: data };
        },
    })
);

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode;
    const message = error.message;
    res.status(status || 500).json({
        message: message,
        validations: error.validations || [],
    });
});
// ----------------------

// DATABASE CONNECTION
mongoose
    .connect(MONGODB_URI)
    .then((results) => {
        console.log("Connected!");
        app.listen(8080);
    })
    .catch((err) => console.log(err));
