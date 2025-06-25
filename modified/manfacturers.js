const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore =  require('@seald-io/nedb');
const async = require("async");
const path = require("path");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "manfacturers.db",
);

app.use(bodyParser.json());

module.exports = app;

let manfacturerDB = new Datastore({
    filename: dbPath,
    autoload: true,
});

manfacturerDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get the welcome message for the manfacturer API.
 *
 * @param {Object} req  request object.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.get("/", function (req, res) {
    res.send("manfacturer API");
});

/**
 * GET endpoint: Get details of all manfacturers.
 *
 * @param {Object} req  request object.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.get("/all", function (req, res) {
    manfacturerDB.find({}, function (err, docs) {
        res.send(docs);
    });
});

/**
 * POST endpoint: Create a new manfacturer.
 *
 * @param {Object} req  request object with new manfacturer data in the body.
 * @param {Object} res  response object.
 * @returns {void}
 */
/*app.post("/manfacturer", function (req, res) {
    let newmanfacturer = req.body;
    newmanfacturer._id = Math.floor(Date.now() / 1000);
    manfacturerDB.insert(newmanfacturer, function (err, manfacturer) {
            if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                }
        else{res.sendStatus(200);}
    });
});*/
app.post("/manfacturer", function (req, res) {
    const newmanfacturer = req.body;
    const nameToCheck = newmanfacturer.name?.trim().toLowerCase();
          delete newmanfacturer.id;
    if (!nameToCheck) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Manufacturer name is required."
        });
    }

    // Check for duplicate name (case-insensitive)
    manfacturerDB.findOne({ name: new RegExp(`^${nameToCheck}$`, 'i') }, function (err, existing) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        }

        if (existing) {
            return res.status(200).json({
                status: "duplicate"
            });
        }

        newmanfacturer._id = Math.floor(Date.now() / 1000);
        manfacturerDB.insert(newmanfacturer, function (err, manfacturer) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            }

            res.sendStatus(200);
        });
    });
});


/**
 * DELETE endpoint: Delete a manfacturer by manfacturer ID.
 *
 * @param {Object} req  request object with manfacturer ID as a parameter.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.delete("/manfacturer/:manfacturerId", function (req, res) {
    manfacturerDB.remove(
        {
            _id: parseInt(req.params.manfacturerId),
        },
        function (err, numRemoved) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                }
            else{res.sendStatus(200);}
        },
    );
});

/**
 * PUT endpoint: Update manfacturer details.
 *
 * @param {Object} req  request object with updated manfacturer data in the body.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.put("/manfacturer", function (req, res) {
    manfacturerDB.update(
        {
            _id: parseInt(req.body.id),
        },
        req.body,
        {},
        function (err, numReplaced, manfacturer) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                }
            else{res.sendStatus(200);}
        },
    );
});