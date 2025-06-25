const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const async = require("async");
const sanitizeFilename = require('sanitize-filename');
const multer = require("multer");
const fs = require("fs");
const moment = require("moment");
const path = require("path");
const {filterFile} = require('../assets/js/utils');
const validFileTypes = [
    "image/jpg",
    "image/jpeg",
    "image/png",
    "image/webp"];
const maxFileSize = 2097152 //2MB = 2*1024*1024
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "inventory.db",
);
const logdbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "inventory_log.db",
);

const storage = multer.diskStorage({
    destination: path.join(appData, appName, "uploads"),
    filename: function (req, file, callback) {
        callback(null, Date.now()+path.extname(file.originalname));
    },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: maxFileSize },
  fileFilter: filterFile,
}).single("imagename");


app.use(bodyParser.json());

module.exports = app;

let inventoryDB = new Datastore({
    filename: dbPath,
    autoload: true,
});

let inventory_logDB = new Datastore({
    filename: logdbPath,
    autoload: true,
});
inventoryDB.ensureIndex({ fieldName: "_id", unique: true });
inventory_logDB.ensureIndex({ fieldName: "log_id", unique: true });
const {
  DATE_FORMAT,
  moneyFormat,
  isExpired,
  daysToExpire,
  getStockStatus,
  checkFileExists,
  setContentSecurityPolicy,
} = require("../assets/js/utils");

/**
 * GET endpoint: Get the welcome message for the Inventory API.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/", function (req, res) {
    res.send("Inventory API");
});

/**
 * GET endpoint: Get product details by product ID.
 *
 * @param {Object} req request object with product ID as a parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/product/:productId", function (req, res) {
    if (!req.params.productId) {
        res.status(500).send("ID field is required.");
    } else {
        inventoryDB.findOne(
            {
                _id: parseInt(req.params.productId),
            },
            function (err, product) {
                res.send(product);
            },
        );
    }
});

/**
 * GET endpoint: Get all inventory log records.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
/*app.get("/inventory_log", function (req, res) {
    inventory_logDB.find({}).exec(function (err, docs) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred while fetching logs.",
            });
        }
        res.json(docs);
    });
});

inventory_logDB.find({}, function (err, docs) {
  docs.forEach((doc) => {
	  
      inventory_logDB.update(
        { log_id: doc.log_id },
        { $set: { Date: new Date(doc.Date) } },
        {},
        function (err, numReplaced) {
          if (err) console.error(err);
        }
      );
    
  });
});*/

app.get("/inventory_log/all_filters", function (req, res) {
    try {
        inventory_logDB.find({}, { user: 1, _event: 1, reason: 1}, function (err, docs) {
            if (err) {
                console.error("Error fetching all filter options:", err);
                return res.status(500).json({ error: "Internal Server Error", message: "Database query failed for filter options." });
            }

            const allPersons = new Set();
            const allEvents = new Set();
            const allReasons = new Set();

            docs.forEach(doc => {
                if (doc.user) allPersons.add(doc.user);
                if (doc._event) allEvents.add(doc._event);
                if (doc.reason) allReasons.add(doc.reason);
            });

            res.json({
                persons: Array.from(allPersons).sort(), // Convert Set to Array and sort alphabetically
                events: Array.from(allEvents).sort(),
                reasons: Array.from(allReasons).sort()
            });
        });
    } catch (err) {
        console.error("Unhandled error fetching all filter options:", err);
        res.status(500).json({ error: "Unexpected Error", message: "An unexpected error occurred while processing filter options." });
    }
});

app.get("/inventory_log", function (req, res) {
  try {
    const { start, end, person, _event, reason } = req.query;

    // Basic validation for start and end dates
    if (!start || !end) {
      return res.status(400).json({
        error: "Missing date range",
        message: "Start and end dates are required."
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({
        error: "Invalid date format",
        message: "Start or end date is not valid."
      });
    }

    // Build dynamic query
    const query = {
      Date: { $gte: startDate, $lte: endDate }
    };

    if (person && person !== "0") {
      query.user = person;
    }

    if (_event && _event !== "0") {
      query._event = _event;
    }

    if (reason && reason !== "0") {
      query.reason = reason;
    }

    // Fetch filtered and SORTED logs
    inventory_logDB.find(query)
      .sort({ Date: -1 }) // <--- ADD THIS LINE FOR DESCENDING SORT
      .exec(function (err, docs) { // <--- .exec() is required after .sort()
        if (err) {
          console.error("Inventory Log DB Error:", err);
          return res.status(500).json({
            error: "Internal Server Error",
            message: "Database query failed."
          });
        }
        res.send(docs);
      });

  } catch (err) {
    console.error("Unhandled Inventory Log Error:", err);
    res.status(500).json({
      error: "Unexpected Error",
      message: "An unexpected error occurred while processing your request."
    });
  }
});



/**
 * GET endpoint: Get details of all products.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/products", function (req, res) {
    inventoryDB.find({}, function (err, docs) {
        res.send(docs);
    });
});



/**
 * POST endpoint: Create or update a product.
 *
 * @param {Object} req request object with product data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
 const detectChanges = (oldData, newData) => {
    const fields = [
	"name", 
	"category", 
	"manfacturer", 
	"batch_number", 
	"expirationDate", 
	"quantity", 
	"buy_price",
	"price",
	"minStock",
	"cr_code"
	];
    let changes = [];
    fields.forEach(field => {
        if (oldData[field] !== newData[field]) {
            changes.push(`${field}: ${oldData[field]} -> ${newData[field]}`);
        }
    });
    return changes.join(", ");
};

app.post("/product", function (req, res) {
	  let currentTime = new Date(moment());
  let date = moment(currentTime).format("YYYY-MM-DD HH:mm:ss");
    upload(req, res, function (err) {

        if (err) {
            if (err instanceof multer.MulterError) {
                console.error('Upload Error:', err);
                return res.status(400).json({
                    error: 'Upload Error',
                    message: err.message,
                });
            } else {
                console.error('Unknown Error:', err);
                return res.status(500).json({
                    error: 'Internal Server Error',
                    message: err.message,
                });
            }
        }

    let image = "";

    if (validator.escape(req.body.img) !== "") {
        image = sanitizeFilename(req.body.img);
    }

    if (req.file) {
        image = sanitizeFilename(req.file.filename);
    }


    if (validator.escape(req.body.remove) === "1") {
            try {
                let imgPath = path.join(
                appData,
                appName,
                "uploads",
                image,
                );

                if (!req.file) {
                fs.unlinkSync(imgPath);
                image = "";
                }
                
            } catch (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            }

        }

        let Product = {
			_id: parseInt(req.body.id),
			barcode: parseInt(req.body.barcode),
            expirationDate: validator.escape(req.body.expirationDate),
			registrationDate:Date(),
            price: validator.escape(req.body.price),
            buy_price: validator.escape(req.body.buy_price),
			cr_code: validator.escape(req.body.cr_code),
            batch_number: validator.escape(req.body.batch_number),
			manfacturer:parseInt(validator.escape(req.body.manfacturer)),
            category: validator.escape(req.body.category),
            quantity: validator.escape(req.body.quantity) === "" ? 0 : parseInt(validator.escape(req.body.quantity)),
            name: validator.escape(req.body.name),
            stock: req.body.stock === "on" ? 0 : 1,
            minStock: validator.escape(req.body.minStock),
            img: image,
        };
		function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
             }

		const nocaseName = escapeRegex(validator.escape(req.body.name).trim());
		const nocaseBatch = escapeRegex(validator.escape(req.body.batch_number).trim());
		const manf_check = parseInt(validator.escape(req.body.manfacturer));
        
		const productId = req.body.id ? parseInt(validator.escape(req.body.id)) : null;
		const productBarcode = req.body.barcode ? parseInt(validator.escape(req.body.barcode)) : null;
         
		 //chek if the product is not already expired or near to expiry(<3months)
		        let todayDate = moment();
            let expiryDate = moment(Product.expirationDate, DATE_FORMAT);
			const diffDays = daysToExpire(expiryDate);
		    if(isExpired(expiryDate)){
			return res.status(200).json({ status: "already_expired" });
			}
			else if(diffDays > 0 && diffDays <90){
			return res.status(200).json({ status: "less_than_3month" });	
			}
			else{
				           // Always check if the product exists
         inventoryDB.findOne({ _id: productId }, function (err, existingProduct) {
			  if (err) {
				console.error(err);
				return res.status(500).json({
				  error: "Internal Server Error",
				  message: "An unexpected error occurred.",
				});
			  }

			  if (!existingProduct) {
				  delete req.body.loggedin_user;
				// It's a new product attempt – check for duplicates
				inventoryDB.findOne({
				  name: new RegExp("^" + nocaseName + "$", "i"),
				  batch_number: new RegExp("^" + nocaseBatch + "$", "i"),
				  manfacturer: manf_check,
				}, function (err, duplicate) {
				  if (err) {
					console.error(err);
					return res.status(500).json({
					  error: "Internal Server Error",
					  message: "An unexpected error occurred.",
					});
				  }

				  if (duplicate) {
					return res.status(200).json({ status: "duplicate" });
				  } else {
					// Create new ID/barcode
					const timestamp = Math.floor(Date.now() / 1000);
					Product._id = timestamp;
					Product.barcode = timestamp;
					inventoryDB.insert(Product, function (err, product) {
					  if (err) {
						console.error(err);
						return res.status(500).json({
						  error: "Internal Server Error",
						  message: "An unexpected error occurred.",
						});
					  }
					  return res.sendStatus(200);
					});
				  }
				});
			  } else {
				// Product exists – perform update and store the changes in logs
                 let today = moment();
				 const expiryDate = moment(existingProduct.expirationDate,DATE_FORMAT);
				 let reason = "unknown";
				 if (isExpired(expiryDate) && existingProduct.quantity>0) reason = "restocking because of expiration";
		 /*if (existingProduct.quantity <= existingProduct.minStock)*/else reason = "restocking because of low stock";
		const changes = detectChanges(existingProduct, Product);
                                  if (changes) {
                    const logEntry = {
						log_id:Math.floor(Date.now() / 10000),
                        prod_id: existingProduct._id,
                        name: existingProduct.name,
                        category: existingProduct.category,
                        manfacturer: existingProduct.manfacturer,
                        batch_number: existingProduct.batch_number,
                        expirationDate: existingProduct.expirationDate,
                        quantity: existingProduct.quantity,
                        buy_price: existingProduct.buy_price,
                        _event: "edit",
                        reason,
                        changes_made: changes,
                        user:req.body.loggedin_user || "system",
                        Date: new Date()
                    };

                    inventory_logDB.insert(logEntry);
					
	  				inventoryDB.update(
				  { _id: productId, barcode: productBarcode },
				  Product,
				  {},
				  function (err, numReplaced) {
					if (err) {
					  console.error(err);
					  return res.status(500).json({
						error: "Internal Server Error",
						message: "An unexpected error occurred.",
					  });
					}
					else
					{
					return res.sendStatus(200);
					}
				  }
				);
                }
                else{
					return res.status(200).json({ status: "noupdate" });
				}
			  }
			});
			}

    });
});

/**
 * DELETE endpoint: Delete a product by product ID.
 *
 * @param {Object} req request object with product ID as a parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/product/delete", function (req, res) {
  const productId = parseInt(req.body.id);
  const user = req.body.user;
    inventoryDB.findOne({ _id: productId }, (err, product) => {
        if (err || !product) return res.status(404).json({ error: "Product not found" });

        const expiryDate = moment(product.expirationDate, DATE_FORMAT);
        const reason = isExpired(expiryDate) ? "delete because of expiration" : "unknown";
        const logEntry = {
			log_id:Math.floor(Date.now() / 10000),
            prod_id: product._id,
            name: product.name,
            category: product.category,
            manfacturer: product.manfacturer,
            batch_number: product.batch_number,
            expirationDate: product.expirationDate,
            quantity: product.quantity,
            buy_price: product.buy_price,
            _event: "delete",
            reason,
            changes_made: "N/A",
            user: user || "system",
            Date: new Date()
        };
        inventory_logDB.insert(logEntry);

        inventoryDB.remove({ _id: productId }, {}, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.sendStatus(200);
        });
    });
});

/**
 * POST endpoint: Find a product by SKU code.
 *
 * @param {Object} req request object with SKU code in the body.
 * @param {Object} res response object.
 * @returns {void}
 */

app.post("/product/sku", function (req, res) {
    let sku = validator.escape(req.body.skuCode);
    inventoryDB.findOne(
        {
            barcode: parseInt(sku),
        },
        function (err, doc) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            } else {
                res.send(doc);
            }
        },
    );
});

/**
 * Decrement inventory quantities based on a list of products in a transaction.
 *
 * @param {Array} products - List of products in the transaction.
 * @returns {void}
 */
app.decrementInventory = function (products) {
    async.eachSeries(products, function (transactionProduct, callback) {
        inventoryDB.findOne(
            {
                _id: parseInt(transactionProduct.id),
            },
            function (err, product) {
                if (!product || !product.quantity) {
                    callback();
                } else {
                    let updatedQuantity =
                        parseInt(product.quantity) -
                        parseInt(transactionProduct.quantity);

                    inventoryDB.update(
                        {
                            _id: parseInt(product._id),
                        },
                        {
                            $set: {
                                quantity: updatedQuantity,
                            },
                        },
                        {},
                        callback,
                    );
                }
            },
        );
    });
};
