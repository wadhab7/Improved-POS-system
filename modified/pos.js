const jsPDF = require("jspdf");
const html2canvas = require("html2canvas");
const JsBarcode = require("jsbarcode");
const macaddress = require("macaddress");
const notiflix = require("notiflix");
const validator = require("validator");
const DOMPurify = require("dompurify");
const _ = require("lodash");
let fs = require("fs");
let path = require("path");
let moment = require("moment");
let { ipcRenderer } = require("electron");
const clickElementHandler = (event, elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.click();
    } else {
        console.warn(`Attempted to click element with ID "${elementId}" but it was not found.`);
    }
};
ipcRenderer.removeAllListeners("click-element");
ipcRenderer.on("click-element", clickElementHandler);
let dotInterval = setInterval(function () {
  $(".dot").text(".");
}, 3000);
let Store = require("electron-store");
const remote = require("@electron/remote");
const app = remote.app;
let cart = [];
let index = 0;
let allUsers = [];
let allProducts = [];
let allCategories = [];
let allManfacturers = [];
let allTransactions = [];
let allInventoryLogs = [];
let sold = [];
let state = [];
let sold_items = [];
let item;
let auth;
let holdOrder = 0;
let vat = 0;
let perms = null;
let deleteId = 0;
let paymentType = 0;
let receipt = "";
let totalVat = 0;
let subTotal = 0;
let subTotal_Profit=0;
let method = "";
let order_index = 0;
let user_index = 0;
let product_index = 0;
let transaction_index;
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
let host = "localhost";
let port = process.env.PORT;
let img_path = path.join(appData, appName, "uploads", "/");
let api = "http://" + host + ":" + port + "/api/";
const bcrypt = require("bcrypt");
let categories = [];
let manfacturers =[];
let holdOrderList = [];
let customerOrderList = [];
let ownUserEdit = null;
let totalPrice = 0;
let orderTotal = 0;
let auth_error = "Incorrect username or password";
let auth_empty = "Please enter a username and password";
let holdOrderlocation = $("#renderHoldOrders");
let customerOrderLocation = $("#renderCustomerOrders");
let storage = new Store();
let settings;
let platform;
let user = {};
let start = moment().startOf("month");
let end = moment();
let start_date = moment(start).toDate();
let end_date = moment(end).toDate();
let by_till = 0;
let by_user = 0;
let by_status = 1;
let by_person = "";
let by_event = "";
let by_reason = "";
const default_item_img = path.join("assets","images","default.jpg");
const permissions = [
  "perm_products",
  "perm_categories",
  "perm_manfacturers",
  "perm_transactions",
  "perm_inventorylogs",
  "perm_profit_loss",
  "perm_profit_loss_product",
  "perm_users",
  "perm_settings",
];
notiflix.Notify.init({
  position: "right-top",
  cssAnimationDuration: 600,
  messageMaxLength: 150,
  clickToClose: true,
  closeButton: true
});
const {
  DATE_FORMAT,
  moneyFormat,
  isExpired,
  daysToExpire,
  getStockStatus,
  checkFileExists,
  setContentSecurityPolicy,
} = require("./utils");

//set the content security policy of the app
setContentSecurityPolicy();
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}
$(function () {
  function cb(start, end) {
    $("#reportrange span").html(
      start.format("MMMM D, YYYY") + "  -  " + end.format("MMMM D, YYYY"),
    );
  }

  $("#reportrange").daterangepicker(
    {
		
      startDate: start,
      endDate: end,
      autoApply: true,
      timePicker: true,
      timePicker24Hour: true,
      timePickerIncrement: 10,
      timePickerSeconds: true,
      // minDate: '',
      ranges: {
        Today: [moment().startOf("day"), moment()],
        Yesterday: [
          moment().subtract(1, "days").startOf("day"),
          moment().subtract(1, "days").endOf("day"),
        ],
        "Last 7 Days": [
          moment().subtract(6, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "Last 30 Days": [
          moment().subtract(29, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "This Month": [moment().startOf("month"), moment().endOf("month")],
        "This Month": [moment().startOf("month"), moment()],
        "Last Month": [
          moment().subtract(1, "month").startOf("month"),
          moment().subtract(1, "month").endOf("month"),
        ],
      },
    },
    cb,
  );

  cb(start, end);
  
  function cbInvL(start, end) {
    $("#reportrangeInventoryLog span").html(
      start.format("MMMM D, YYYY") + "  -  " + end.format("MMMM D, YYYY"),
    );
  }

  $("#reportrangeInventoryLog").daterangepicker(
    {
		
      startDate: start,
      endDate: end,
      autoApply: true,
      timePicker: true,
      timePicker24Hour: true,
      timePickerIncrement: 10,
      timePickerSeconds: true,
      // minDate: '',
      ranges: {
        Today: [moment().startOf("day"), moment()],
        Yesterday: [
          moment().subtract(1, "days").startOf("day"),
          moment().subtract(1, "days").endOf("day"),
        ],
        "Last 7 Days": [
          moment().subtract(6, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "Last 30 Days": [
          moment().subtract(29, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "This Month": [moment().startOf("month"), moment().endOf("month")],
        "This Month": [moment().startOf("month"), moment()],
        "Last Month": [
          moment().subtract(1, "month").startOf("month"),
          moment().subtract(1, "month").endOf("month"),
        ],
      },
    },
    cbInvL,
  );

  cbInvL(start, end);
   
  $("#expirationDate").daterangepicker({
    singleDatePicker: true,
    locale: {
      format: DATE_FORMAT,
    },
  });
});

//Allow only numbers in input field
$.fn.allowOnlyNumbers = function() {
  return this.on('keydown', function(e) {
  // Allow: backspace, delete, tab, escape, enter, ., ctrl/cmd+A, ctrl/cmd+C, ctrl/cmd+X, ctrl/cmd+V, end, home, left, right, down, up
    if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 || 
      (e.keyCode >= 35 && e.keyCode <= 40) || 
      ((e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88) && (e.ctrlKey === true || e.metaKey === true))) {
      return;
  }
  // Ensure that it is a number and stop the keypress
  if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
    e.preventDefault();
  }
});
};
$('.number-input').allowOnlyNumbers();

//Serialize Object
$.fn.serializeObject = function () {
  var o = {};
  var a = this.serializeArray();
  $.each(a, function () {
    if (o[this.name]) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || "");
    } else {
      o[this.name] = this.value || "";
    }
  });
  return o;
};

auth = storage.get("auth");
user = storage.get("user");

$("#main_app").hide();
if (auth == undefined) {
  $.get(api + "users/check/", function (data) {});

  authenticate();
} else {
  $("#login").hide();
  $("#main_app").show();
  $("#Inventorylog_view").hide();
  platform = storage.get("settings");

  if (platform != undefined) {
    if (platform.app == "Network Point of Sale Terminal") {
      api = "http://" + platform.ip + ":" + port + "/api/";
      perms = true;
    }
  }

  setTimeout(function () {$.get(api + "users/user/" + user._id, function (data) {
    user = data;
	let user_fullname = user.fullname;
	window.user_fullname = user_fullname;
    $("#loggedin-user").text(user.fullname);
  }),200});

  /*$.get(api + "settings/get", function (data) {
    settings = data.settings;
  });*/

  setTimeout(function () {$.get(api + "users/all", function (users) {
    allUsers = [...users];
  }),100});
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function loadProducts() {
  $.get(api + "inventory/products", function (data) {
    // Sort products by registrationDate descending (newest first)
    data.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));

    data.forEach((item) => {
      item.price = parseFloat(item.price).toFixed(2);
      item.buy_price = parseFloat(item.buy_price).toFixed(2);
    });

    allProducts = [...data];

    loadProductList();

    let delay = 0;
    let expiredCount = 0;
    allProducts.forEach((product) => {
    if(product.quantity>0)
	{
       let todayDate = moment();
      let expiryDate = moment(product.expirationDate, DATE_FORMAT);
      if (!isExpired(expiryDate)) {
        const diffDays = daysToExpire(expiryDate);

        if (diffDays > 0 && diffDays <= 90) {
          var days_noun = diffDays > 1 ? "days" : "day";
          notiflix.Notify.warning(
            `${product.name} with Batch Number(${product.batch_number}) has only ${diffDays} ${days_noun} left to expiry`,
          );
        }
      } else {
        expiredCount++;
      }
	}
    });

    if (expiredCount > 0) {
      notiflix.Notify.failure(
        `${expiredCount} ${expiredCount > 1 ? "products" : "product"} expired. Please restock!`,
      );
    }

    $("#parent").text("");

    data.forEach((item) => {
      if (!categories.includes(item.category)) {
        categories.push(item.category);
      }
	  if (!manfacturers.includes(item.manfacturers)) {
        manfacturers.push(item.manfacturer);
      }
      let item_isExpired = isExpired(item.expirationDate);
      let item_stockStatus = getStockStatus(item.quantity, item.minStock);
      let item_img = "";

      if (item.img === "") {
        item_img = default_item_img;
      } else {
        item_img = path.join(img_path, item.img);
        item_img = checkFileExists(item_img) ? item_img : default_item_img;
      }
	                      	  
      let item_info = `<div class="col-lg-2 box ${item.category} ${item.manfacturer}"
                            onclick="$(this).addToCart(${item._id}, ${
                              item.quantity
                            }, ${item.stock})">  
                        <div class="widget-panel widget-style-2 " title="${item.name}">                    
                        <div id="image"><img src="${item_img}" id="product_img" alt=""></div>                    
                                    <div class="text-muted m-t-5 text-center">
                                    <div class="name" id="product_name"><span class="${
                                      item_isExpired && item.quantity > 0 ? "text-danger" : ""
                                    }">${item.name}</span></div> 
                                    <span class="sku">${
                                      item.barcode || item._id
                                    }</span>
								<span class="batch_number" style="display:none;">${
                                      item.batch_number
                                    }</span>
                                    <span class="${item_stockStatus < 1 ? 'text-danger' : ''}"><span class="stock">STOCK </span><span class="count">${
                                      item.stock == 1
                                        ? item.quantity
                                        : "N/A"
                                    }</span></span></div>
                                    <span class="text-success text-center"><b data-plugin="counterup">${
                                    moneyFormat(item.price) +
                                    validator.unescape(settings.symbol)
                                    }</b> </span>
                        </div>
                    </div>`;
      $("#parent").append(item_info);
    });
  })
}

	

    function loadCategoryList() {
      let category_list = "";
      let counter = 0;
      $("#category_list").empty();
      $("#categoryList").DataTable().destroy();
     allCategories.sort((a, b) => a.name.localeCompare(b.name));
      allCategories.forEach((category, index) => {
        counter++;

        category_list += `<tr>
     
            <td>${category.name}</td>
            <td><span class="btn-group"><button onClick="$(this).editCategory(${index})" class="btn btn-warning"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteCategory(${category._id})" class="btn btn-danger"><i class="fa fa-trash"></i></button></span></td></tr>`;
      });

      if (counter == allCategories.length) {
        $("#category_list").html(category_list);
        $("#categoryList").DataTable({
          autoWidth: false,
          info: true,
          JQueryUI: true,
          ordering: true,
          paging: false,
        });
      }
    }
	
    function loadManfacturerList() {
      let manfacturer_list = "";
      let counter = 0;
      $("#manfacturer_list").empty();
      $("#ManfacturerList").DataTable().destroy();
      allManfacturers.sort((a, b) => a.name.localeCompare(b.name));
      allManfacturers.forEach((manfacturer, index_) => {
        counter++;

        manfacturer_list += `<tr>
     
            <td>${manfacturer.name}</td>
            <td><span class="btn-group"><button onClick="$(this).editManfacturer(${index_})" class="btn btn-warning"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteManfacturer(${manfacturer._id})" class="btn btn-danger"><i class="fa fa-trash"></i></button></span></td></tr>`;
      });

      if (counter == allManfacturers.length) {
        $("#manfacturer_list").html(manfacturer_list);
        $("#ManfacturerList").DataTable({
          autoWidth: false,
          info: true,
          JQueryUI: true,
          ordering: true,
          paging: false,
        });
      }
    }

    function loadProductList() {
      let products = [...allProducts];
      let product_list = "";
      let counter = 0;
      $("#product_list").empty();
      $("#productList").DataTable().destroy();
    products.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));
      products.forEach((product, index) => {
        counter++;

        let category = allCategories.filter(function (category) {
          return category._id == product.category;
        });
	   let manfacturer = allManfacturers.filter(function (manfacturer) {
          return manfacturer._id == product.manfacturer;
        });

        product.stockAlert = "";
		product.expiryAlert = "";
        //show stock status indicator
        const stockStatus = getStockStatus(product.quantity,product.minStock);
		if(stockStatus === 0){
			product.stockStatus = "No Stock";
            icon = "fa fa-exclamation-triangle";
		product.stockAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.stockStatus}</small></p>`;
		}
		else{
        const todayDate = moment();
        const expiryDate = moment(product.expirationDate, DATE_FORMAT);
			if (isExpired(expiryDate)){
			icon = "fa fa-exclamation-triangle";
          product.expiryStatus = "Expired";
          product.expiryAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.expiryStatus}</small></p>`;	
			}
			else{
		const diffDays = daysToExpire(expiryDate);
			if(stockStatus === -1){
		    product.stockStatus = "Low Stock";
            icon = "fa fa-caret-down";	
         if (diffDays > 0 && diffDays <= 90) {
            var days_noun = diffDays > 1 ? "days" : "day";
            icon = "fa fa-clock-o";
            product.expiryStatus = `${diffDays} ${days_noun} left`;
            product.expiryAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.expiryStatus}</small></p>`;
          }	
            product.stockAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.stockStatus}</small></p>`;		  
			}
           else{
			   //normal Stock but expiration days  may be between 1 and 90 days
			if (diffDays > 0 && diffDays <= 90) {
            var days_noun = diffDays > 1 ? "days" : "day";
            icon = "fa fa-clock-o";
            product.expiryStatus = `${diffDays} ${days_noun} left`;
            product.expiryAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.expiryStatus}</small></p>`;
          } 
		   }			
			}
		}
        /*  if(stockStatus<=0)
          {
          if (stockStatus === 0) {
            product.stockStatus = "No Stock";
            icon = "fa fa-exclamation-triangle";
          }
          if (stockStatus === -1) {
            product.stockStatus = "Low Stock";
            icon = "fa fa-caret-down";
			
          }

          product.stockAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.stockStatus}</small></p>`;
        }
        //calculate days to expiry
        product.expiryAlert = "";
        if (!isExpired(expiryDate)) {
          const diffDays = daysToExpire(expiryDate);

          if (diffDays > 0 && diffDays <= 90) {
            var days_noun = diffDays > 1 ? "days" : "day";
            icon = "fa fa-clock-o";
            product.expiryStatus = `${diffDays} ${days_noun} left`;
            product.expiryAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.expiryStatus}</small></p>`;
          }
        } else {
          icon = "fa fa-exclamation-triangle";
          product.expiryStatus = "Expired";
          product.expiryAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.expiryStatus}</small></p>`;
        }  */

        if(product.img==="")
        {
          product_img=default_item_img;
        }
        else
        {
          product_img = img_path + product.img;
          product_img = checkFileExists(product_img)
          ? product_img
          : default_item_img;
        }
        
        //render product list
        product_list +=
          `<tr>
            <td><svg id="barcode_${product._id}"></svg>
		  <span><button class="btn btn-success" onClick="$(this).printBarcode(${product._id})">print</button></span>
		  </td>
            <td>${product.name}
            ${product.expiryAlert}</td>
			<td>${product.batch_number}</td>
			<td>${manfacturer.length > 0 ? manfacturer[0].name : ""}</td>
			<td>${product.buy_price}${validator.unescape(settings?.symbol||"ETB")}</td>
            <td>${product.price}${validator.unescape(settings?.symbol)}</td>
            <td>${product.stock == 1 ? product.quantity : "N/A"}
            ${product.stockAlert}
            </td>
            <td>${product.expirationDate}</td>
            <td>${category.length > 0 ? category[0].name : ""}</td>
            <td class="nobr"><span class="btn-group"><button onClick="$(this).editProduct(${index})" class="btn btn-warning btn-sm"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteProduct(${
              product._id
            })" class="btn btn-danger btn-sm"><i class="fa fa-trash"></i></button></span></td></tr>`;

        if (counter == allProducts.length) {
          $("#product_list").html(product_list);

			products.forEach((product) => {
			  let bcode = product.barcode || product._id;
			  $("#barcode_" + product._id).JsBarcode(bcode, {
				width: 0.3,
				height: 8,
				fontSize: 5,
				displayValue: true,
				format: "CODE128",
			  });
			});
			}
      });

      $("#productList").DataTable({
        order: [[1, "desc"]],
        autoWidth: false,
        info: true,
        JQueryUI: true,
        ordering: true,
        paging: false,
        dom: "Bfrtip",
        buttons: [
          {
            extend: "pdfHtml5",
            className: "btn btn-light", // Custom class name
            text: " Download PDF", // Custom text
            filename: "product_list.pdf", // Default filename
          },
        ],
      });
    }

async function loadInitialData() {
  try {
    // Load Settings
    const settingsData = await $.get(api + "settings/get");
    settings = settingsData.settings;

    // Load Current User
    const userData = await $.get(api + "users/user/" + user._id);
    user = userData;
    $("#loggedin-user").text(user.fullname);
    window.user_fullname = user.fullname;

    // Optional delay between requests
    await delay(300);

    // Load All Users
    const users = await $.get(api + "users/all");
    allUsers = [...users];

    await delay(300);

    // Load All Products
    await loadProducts();  // Already defined function

    await delay(300);

    // Load Categories
    await $.get(api + "categories/all", (data) => {
      allCategories = data;
      loadCategoryList(); // Already defined
      $("#category").html(`<option value="0">Select category</option>`);
      $("#categories").html(`<option value="0">All</option>`);
      data.sort((a, b) => a.name.localeCompare(b.name));
      data.forEach((category) => {
        $("#category,#categories").append(
          `<option value="${category._id}">${category.name}</option>`
        );
      });
    });

    await delay(300);

    // Load Manufacturers
    await $.get(api + "manfacturers/all", (data) => {
      allManfacturers = data;
      loadManfacturerList(); // Already defined
      data.sort((a, b) => a.name.localeCompare(b.name));
      $("#manfacturer").html(`<option value="0">Select manufacturer</option>`);
      $("#manfacturers").html(`<option value="0">All</option>`);
      data.forEach((man) => {
        $("#manfacturer,#manfacturers").append(
          `<option value="${man._id}">${man.name}</option>`
        );
      });
    });

    await delay(300);

    // Load Customers
    await $.get(api + "customers/all", (customers) => {
      $("#customer").html(`<option value="0" selected>Walk in customer</option>`);
      customers.forEach((cust) => {
        $("#customer").append(
          `<option value='{"id": ${cust._id}, "name": "${cust.name}"}'>${cust.name}</option>`
        );
      });
    });

    await delay(300);

    // Load On-Hold Orders
    const onHoldData = await $.get(api + "on-hold");
    holdOrderList = onHoldData;
    holdOrderlocation.empty();
    $(this).renderHoldOrders(holdOrderList, holdOrderlocation, 1);
  } catch (err) {
    console.error("Error loading initial data:", err);
    notiflix.Report.failure("Error", "Failed to load startup data. Please refresh.", "OK");
  }
}

  $(document).ready(function () {
    //update title based on company
    let appTitle = !!settings ? `${validator.unescape(settings.store)} - ${appName}` : appName;
    $("title").text(appTitle);

    $(".loading").hide();
	loadInitialData();
    if (settings && validator.unescape(settings.symbol)) {
      $("#price_curr, #payment_curr, #change_curr").text(validator.unescape(settings.symbol));
    }

    setTimeout(function () {
      if (settings == undefined && auth != undefined) {
        $("#settingsModal").modal("show");
      } else {
        vat = parseFloat(validator.unescape(settings.percentage));
        $("#taxInfo").text(settings.charge_tax ? vat : 0);
      }
    }, 1500);

    $("#settingsModal").on("hide.bs.modal", function () {
      setTimeout(function () {
        if (settings == undefined && auth != undefined) {
          $("#settingsModal").modal("show");
        }
      }, 1000);
    });

    if (0 == user.perm_products) {
      $(".p_one").hide();
    }
    if (0 == user.perm_categories) {
      $(".p_two").hide();
    }
	if (0 == user.perm_manfacturers) {
      $(".p_six").hide();
    }
    if (0 == user.perm_transactions) {
      $(".p_three").hide();
    }
	if (0 == user.perm_inventorylogs) {
      $(".p_eight").hide();
    }
	if (0 == user.perm_profit_loss) {
      $(".p_seven").hide();
    }
	if (0 == user.perm_profit_loss_product){
		  $("#productSales").hide();
    $("#sales_by_product").hide();
	}
    if (0 == user.perm_users) {
      $(".p_four").hide();
    }
    if (0 == user.perm_settings) {
      $(".p_five").hide();
    }




  /*function loadCategories() {
     $.get(api + "categories/all", function (data) {
        allCategories = data;
        loadCategoryList();
	data.sort((a, b) => a.name.localeCompare(b.name));
        $("#category").html(`<option value="0">Select category</option>`);
		$("#categories").html(`<option value="0">All</option>`);
        allCategories.forEach((category) => {
          $("#category,#categories").append(
            `<option value="${category._id}">${category.name}</option>`,
          );
        });
      });
    }
	
	    function loadManfacturers() {
      $.get(api + "manfacturers/all", function (data) {
        allManfacturers = data;
		//console.log(allManfacturers.length)
        loadManfacturerList();
		data.sort((a, b) => a.name.localeCompare(b.name));
        $("#manfacturer").html(`<option value="0">Select manufacturer</option>`);
		$("#manfacturers").html(`<option value="0">All</option>`);
        allManfacturers.forEach((manfacturer) => {
          $("#manfacturer,#manfacturers").append(
            `<option value="${manfacturer._id}">${manfacturer.name}</option>`,
          );
        });
      });
    }*/

    function loadCustomers() {
      $.get(api + "customers/all", function (customers) {
        $("#customer").html(
          `<option value="0" selected="selected">Walk in customer</option>`,
        );

        customers.forEach((cust) => {
          let customer = `<option value='{"id": ${cust._id}, "name": "${cust.name}"}'>${cust.name}</option>`;
          $("#customer").append(customer);
        });
      });
    }
	
	$.fn.addToCart = function (id, count, stock) {
    // Find the product from the already loaded allProducts array
    const product = allProducts.find(p => p._id === id);
    if (!product) {
        notiflix.Report.failure("Error", "Product data not found locally. Please refresh.", "Ok");
        return;
    }
	else{
		if(product.quantity>0){
			   if (isExpired(product.expirationDate)) {
        notiflix.Report.failure(
            "Expired",
            `${product.name} with Batch Number (${product.batch_number}) is expired! Please restock.`,
            "Ok",
        );
    }
	else{
		$(this).addProductToCart(product); // Add the found product to cart
	}
		}
		else if(product.stock == 1 && product.quantity <= 0){
	             notiflix.Report.failure(
                "Out of stock!",
                `${product.name} with Batch Number(${product.batch_number}) is out of stock! Please restock.`,
                "Ok",
            );
            return; // Prevent adding if out of stock
		}
	}
};

    function barcodeSearch(e) {
      e.preventDefault();
      let searchBarCodeIcon = $(".search-barcode-btn").html();
      $(".search-barcode-btn").empty();
      $(".search-barcode-btn").append(
        $("<i>", { class: "fa fa-spinner fa-spin" }),
      );

      let req = {
        skuCode: $("#skuCode").val(),
      };

      $.ajax({
        url: api + "inventory/product/sku",
        type: "POST",
        data: JSON.stringify(req),
        contentType: "application/json; charset=utf-8",
        cache: false,
        processData: false,
        success: function (product) {
          $(".search-barcode-btn").html(searchBarCodeIcon);
          const expired = isExpired(product.expirationDate);
          if (product._id != undefined && product.quantity >= 1 && !expired) {
            $(this).addProductToCart(product);
            $("#searchBarCode").get(0).reset();
            $("#basic-addon2").empty();
            $("#basic-addon2").append(
              $("<i>", { class: "glyphicon glyphicon-ok" }),
            );
          } else if (expired) {
            notiflix.Report.failure(
              "Expired!",
              `${product.name} is expired`,
              "Ok",
            );
          } else if (product.quantity < 1) {
            notiflix.Report.info(
              "Out of stock!",
              "This item is currently unavailable",
              "Ok",
            );
          } else {
            notiflix.Report.warning(
              "Not Found!",
              "<b>" + $("#skuCode").val() + "</b> is not a valid barcode!",
              "Ok",
            );

            $("#searchBarCode").get(0).reset();
            $("#basic-addon2").empty();
            $("#basic-addon2").append(
              $("<i>", { class: "glyphicon glyphicon-ok" }),
            );
          }
        },
        error: function (err) {
          if (err.status === 422) {
            $(this).showValidationError(data);
            $("#basic-addon2").append(
              $("<i>", { class: "glyphicon glyphicon-remove" }),
            );
          } else if (err.status === 404) {
            $("#basic-addon2").empty();
            $("#basic-addon2").append(
              $("<i>", { class: "glyphicon glyphicon-remove" }),
            );
          } else {
            $(this).showServerError();
            $("#basic-addon2").empty();
            $("#basic-addon2").append(
              $("<i>", { class: "glyphicon glyphicon-warning-sign" }),
            );
          }
        },
      });
    }
   const debouncedBarcodeSearch = debounce(barcodeSearch, 300);
    $("#searchBarCode").on("submit", function (e) {
	   e.preventDefault();
	   debouncedBarcodeSearch.call(this, e);
    });

    $("body").on("click", "#jq-keyboard button", function (e) {
      let pressed = $(this)[0].className.split(" ");
      if ($("#skuCode").val() != "" && pressed[2] == "enter") {
        debouncedBarcodeSearch.call(this, e);
      }
    });

    $.fn.addProductToCart = function (data) {
		const category = allCategories.find(cat=>String(cat._id) === String(data.category))?.name;
		const manfacturer = allManfacturers.find(man=>man._id === data.manfacturer);
      item = {
        id: data._id,
        product_name: data.name,
		category_name: category,
		manfacturer_name: manfacturer.name,
		batch_number: data.batch_number,
        sku: data.sku,
		buy_price: data.buy_price,
        price: data.price,
		cr_code: data.cr_code,
        quantity: 1,
      };

      if ($(this).isExist(item)) {
        $(this).qtIncrement(index);
      } else {
        cart.push(item);
        $(this).renderTable(cart);
      }
    };

    $.fn.isExist = function (data) {
      let toReturn = false;
      $.each(cart, function (index, value) {
        if (value.id == data.id) {
          $(this).setIndex(index);
          toReturn = true;
        }
      });
      return toReturn;
    };

    $.fn.setIndex = function (value) {
      index = value;
    };

    $.fn.calculateCart = function () {
	  
      let total = 0;
      let grossTotal;
      let total_items = 0;
	  let total_profit = 0;
      $.each(cart, function (index, data) {
        total += data.quantity * data.price;
        total_items += parseInt(data.quantity);
		total_profit += (data.price-data.buy_price)*data.quantity;
      });
      $("#total").text(total_items);
      total = total - $("#inputDiscount").val();
	  total_profit = total_profit - $("#inputDiscount").val();
      $("#price").text(moneyFormat(total.toFixed(2))+validator.unescape(settings.symbol));

      subTotal = total;
      subTotal_Profit=total_profit;
      if ($("#inputDiscount").val() >= total) {
        $("#inputDiscount").val(0);
      }

      if (settings.charge_tax) {
        totalVat = (total * vat) / 100;
        grossTotal = total + totalVat;
      } else {
        grossTotal = total;
      }

      orderTotal = grossTotal.toFixed(2);

      $("#gross_price").text(moneyFormat(orderTotal)+validator.unescape(settings.symbol));
      $("#payablePrice").val(moneyFormat(grossTotal));
    };

    $.fn.renderTable = function (cartList) {
      $("#cartTable .card-body").empty();
      $(this).calculateCart();
      $.each(cartList, function (index, data) {
        $("#cartTable .card-body").append(
          $("<div>", { class: "row m-t-10" }).append(
            $("<div>", { class: "col-md-1", text: index + 1 }),
            $("<div>", { class: "col-md-3", text: data.product_name }),
            $("<div>", { class: "col-md-3" }).append(
              $("<div>", { class: "input-group" }).append(
                $("<span>", { class: "input-group-btn" }).append(
                  $("<button>", {
                    class: "btn btn-light",
                    onclick: "$(this).qtDecrement(" + index + ")",
                  }).append($("<i>", { class: "fa fa-minus" })),
                ),
                $("<input>", {
                  class: "form-control",
                  type: "text",
                  value: data.quantity,
                  min: "1",
                  onInput: "$(this).qtInput(" + index + ")",
                }),
                $("<span>", { class: "input-group-btn" }).append(
                  $("<button>", {
                    class: "btn btn-light",
                    onclick: "$(this).qtIncrement(" + index + ")",
                  }).append($("<i>", { class: "fa fa-plus" })),
                ),
              ),
            ),
            $("<div>", {
              class: "col-md-2",
              text:
                 moneyFormat((data.price * data.quantity).toFixed(2))+
				 validator.unescape(settings.symbol),
            }),
			  $("<div>", {
              class: "col-md-2",
              text:data.cr_code}),
            $("<div>", { class: "col-md-1" }).append(
              $("<button>", {
                class: "btn btn-light btn-xs",
                onclick: "$(this).deleteFromCart(" + index + ")",
              }).append($("<i>", { class: "fa fa-times" })),
            ),
          ),
        );
      });
    };

    $.fn.deleteFromCart = function (index) {
      cart.splice(index, 1);
      $(this).renderTable(cart);
    };

    $.fn.qtIncrement = function (i) {
      item = cart[i];
      let product = allProducts.filter(function (selected) {
        return selected._id == parseInt(item.id);
      });

      if (product[0].stock == 1) {
        if (item.quantity < product[0].quantity) {
          item.quantity = parseInt(item.quantity) + 1;
          $(this).renderTable(cart);
        } else {
          notiflix.Report.info(
            "No more stock!",
            "You have already added all the available stock.",
            "Ok",
          );
        }
      } else {
        item.quantity = parseInt(item.quantity) + 1;
        $(this).renderTable(cart);
      }
    };

    $.fn.qtDecrement = function (i) {
      if (item.quantity > 1) {
        item = cart[i];
        item.quantity = parseInt(item.quantity) - 1;
        $(this).renderTable(cart);
      }
    };

    $.fn.qtInput = function (i) {
      item = cart[i];
      item.quantity = $(this).val();
      $(this).renderTable(cart);
    };

    $.fn.cancelOrder = function () {
      if (cart.length > 0) {
        const diagOptions = {
          title: "Are you sure?",
          text: "You are about to remove all items from the cart.",
          icon: "warning",
          showCancelButton: true,
          okButtonText: "Yes, clear it!",
          cancelButtonText: "Cancel",
          options: {
            // okButtonBackground: "#3085d6",
            cancelButtonBackground: "#d33",
          },
        };

        notiflix.Confirm.show(
          diagOptions.title,
          diagOptions.text,
          diagOptions.okButtonText,
          diagOptions.cancelButtonText,
          () => {
            cart = [];
            $(this).renderTable(cart);
            holdOrder = 0;
            notiflix.Report.success(
              "Cleared!",
              "All items have been removed.",
              "Ok",
            );
          },
          "",
          diagOptions.options,
        );
      }
    };

    $("#payButton").on("click", function () {
      if (cart.length != 0) {
        $("#paymentModel").modal("toggle");
      } else {
        notiflix.Report.warning("Oops!", "There is nothing to checkout!", "Ok");
      }
    });

    $("#hold").on("click", function () {
      if (cart.length != 0) {
        $("#dueModal").modal("toggle");
      } else {
        notiflix.Report.warning("Oops!", "There is nothing to hold!", "Ok");
      }
    });

    function printJobComplete() {
      notiflix.Report.success("Done", "print job complete", "Ok");
    }

    $.fn.submitDueOrder = function (status) {
      let items = "";
      let payment = 0;
      paymentType = $('.list-group-item.active').data('payment-type');
      cart.forEach((item) => {
    items += `<tr><td>${DOMPurify.sanitize(item.product_name)}</td><td>${
      DOMPurify.sanitize(item.quantity)
    } </td><td class="text-right"> ${moneyFormat(
      DOMPurify.sanitize(Math.abs(item.price).toFixed(2)),)} 
	  ${DOMPurify.sanitize(validator.unescape(settings.symbol))}
	  </td></tr>`;
});

      let currentTime = new Date(moment());
      let discount = $("#inputDiscount").val();
      let customer = JSON.parse($("#customer").val());
      let date = moment(currentTime).format("YYYY-MM-DD HH:mm:ss");
      let paymentAmount = $("#payment").val().replace(",", "");
      let changeAmount = $("#change").text().replace(",", "");
      let paid =
        $("#payment").val() == "" ? "" : parseFloat(paymentAmount).toFixed(2);
      let change =
        $("#change").text() == "" ? "" : parseFloat(changeAmount).toFixed(2);
      let refNumber = $("#refNumber").val();
      let orderNumber = holdOrder;
      let type = "";
      let tax_row = "";
      switch (paymentType) {
        case 1:
          type = "Cash";
          break;
        case 3:
          type = "Card";
          break;
      }

      if (paid != "") {
        payment = `<tr>
                        <td>Paid</td>
                        <td>:</td>
                        <td class="text-right">${moneyFormat(
                          Math.abs(paid).toFixed(2),)} ${validator.unescape(settings.symbol)} </td>
                    </tr>
                    <tr>
                        <td>Change</td>
                        <td>:</td>
        <td class="text-right">${moneyFormat(Math.abs(change).toFixed(2),)} ${validator.unescape(settings.symbol)}</td>
                    </tr>
                    <tr>
                        <td>Method</td>
                        <td>:</td>
                        <td class="text-right">${type}</td>
                    </tr>`;
      }

      if (settings.charge_tax) {
        tax_row = `<tr>
                    <td>VAT(${validator.unescape(settings.percentage)})% </td>
                    <td>:</td>
     <td class="text-right">${moneyFormat(parseFloat(totalVat).toFixed(2),)} ${validator.unescape(settings.symbol)} 
			   </td>
                </tr>`;
      }

      if (status == 0) {
        if ($("#customer").val() == 0 && $("#refNumber").val() == "") {
          notiflix.Report.warning(
            "Reference Required!",
            "You either need to select a customer <br> or enter a reference!",
            "Ok",
          );
          return;
        }
      }

      $(".loading").show();

      if (holdOrder != 0) {
        orderNumber = holdOrder;
        method = "PUT";
      } else {
        orderNumber = Math.floor(Date.now() / 1000);
        method = "POST";
      }

      logo = path.join(img_path, validator.unescape(settings.img));

      receipt = `<div style="font-size: 10px">                            
        <p style="text-align: center;">
        ${
          checkFileExists(logo)
            ? `<img style='max-width: 50px' src='${logo}' /><br>`
            : ``
        }
            <span style="font-size: 22px;">${validator.unescape(settings.store)}</span> <br>
            ${validator.unescape(settings.address_one)} <br>
            ${validator.unescape(settings.address_two)} <br>
            ${
              validator.unescape(settings.contact) != "" ? "Tel: " + validator.unescape(settings.contact) + "<br>" : ""
            } 
            ${validator.unescape(settings.tax) != "" ? "Vat No: " + validator.unescape(settings.tax) + "<br>" : ""} 
        </p>
        <hr>
        <left>
            <p>
            Invoice : ${orderNumber} <br>
            Customer : ${
              customer == 0 ? "Walk in customer" : _.escape(customer.name)
            } <br>
            Cashier : ${user.fullname} <br>
            Date : ${date}<br>
            </p>

        </left>
        <hr>
        <table width="90%">
            <thead>
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th class="text-right">Price</th>
            </tr>
            </thead>
            <tbody>
             ${items}                
            <tr><td colspan="3"><hr></td></tr>
            <tr>                        
                <td><b>Subtotal</b></td>
                <td>:</td>
                <td class="text-right"><b>${moneyFormat(subTotal.toFixed(2),)}${validator.unescape(settings.symbol)}
				  </b></td>
            </tr>
            <tr>
                <td>Discount</td>
                <td>:</td>
                <td class="text-right">${
                  discount > 0
                    ? moneyFormat(parseFloat(discount).toFixed(2))+
					validator.unescape(settings.symbol) 
                    : ""
                }</td>
            </tr>
            ${tax_row}
            <tr>
                <td><h5>Total</h5></td>
                <td><h5>:</h5></td>
                <td class="text-right">
                    <h5>${moneyFormat(
                      parseFloat(orderTotal).toFixed(2),)} ${validator.unescape(settings.symbol)}</h3>
                </td>
            </tr>
            ${payment == 0 ? "" : payment}
            </tbody>
            </table>
            <br>
            <hr>
            <br>
            <p style="text-align: center;">
             ${validator.unescape(settings.footer)}
             </p>
            </div>`;

      if (status == 3) {
        if (cart.length > 0) {
          printJS({ printable: receipt, type: "raw-html" });

          $(".loading").hide();
          return;
        } else {
          $(".loading").hide();
          return;
        }
      }

      let data = {
        order: orderNumber,
        ref_number: refNumber,
        discount: discount,
        customer: customer,
        status: status,
        subtotal: parseFloat(subTotal).toFixed(2),
		subtotal_profit:parseFloat(subTotal_Profit).toFixed(2),
        tax: totalVat,
        order_type: 1,
        items: cart,
        date: currentTime,
        payment_type: type,
        payment_info: $("#paymentInfo").val(),
        total: orderTotal,
        paid: paid,
        change: change,
        _id: orderNumber,
        till: platform.till,
        mac: platform.mac,
        user: user.fullname,
        user_id: user._id,
      };

      $.ajax({
        url: api + "new",
        type: method,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        cache: false,
        processData: false,
        success: function (data) {
          cart = [];
          receipt = DOMPurify.sanitize(receipt,{ ALLOW_UNKNOWN_PROTOCOLS: true });
          $("#viewTransaction").html("");
          $("#viewTransaction").html(receipt);
          $("#orderModal").modal("show");
          loadProducts();
          loadCustomers();
          $(".loading").hide();
          $("#dueModal").modal("hide");
          $("#paymentModel").modal("hide");
          $(this).getHoldOrders();
          $(this).getCustomerOrders();
          $(this).renderTable(cart);
        },

        error: function (data) {
          $(".loading").hide();
          $("#dueModal").modal("toggle");
          notiflix.Report.failure(
            "Something went wrong!",
            "Please refresh this page and try again",
            "Ok",
          );
        },
      });

      $("#refNumber").val("");
      $("#change").text("");
      $("#payment,#paymentText").val("");
    };

    $.get(api + "on-hold", function (data) {
      holdOrderList = data;
      holdOrderlocation.empty();
      // clearInterval(dotInterval);
      $(this).renderHoldOrders(holdOrderList, holdOrderlocation, 1);
    });

    $.fn.getHoldOrders = function () {
      $.get(api + "on-hold", function (data) {
        holdOrderList = data;
        clearInterval(dotInterval);
        holdOrderlocation.empty();
        $(this).renderHoldOrders(holdOrderList, holdOrderlocation, 1);
      });
    };

    $.fn.renderHoldOrders = function (data, renderLocation, orderType) {
      $.each(data, function (index, order) {
        $(this).calculatePrice(order);
        renderLocation.append(
          $("<div>", {
            class:
              orderType == 1 ? "col-md-3 order" : "col-md-3 customer-order",
          }).append(
            $("<a>").append(
              $("<div>", { class: "card-box order-box" }).append(
                $("<p>").append(
                  $("<b>", { text: "Ref :" }),
                  $("<span>", { text: order.ref_number, class: "ref_number" }),
                  $("<br>"),
                  $("<b>", { text: "Price :" }),
                  $("<span>", {
                    text: order.total,
                    class: "label label-info",
                    style: "font-size:14px;",
                  }),
                  $("<br>"),
                  $("<b>", { text: "Items :" }),
                  $("<span>", { text: order.items.length }),
                  $("<br>"),
                  $("<b>", { text: "Customer :" }),
                  $("<span>", {
                    text:
                      order.customer != 0
                        ? order.customer.name
                        : "Walk in customer",
                    class: "customer_name",
                  }),
                ),
                $("<button>", {
                  class: "btn btn-danger del",
                  onclick:
                    "$(this).deleteOrder(" + index + "," + orderType + ")",
                }).append($("<i>", { class: "fa fa-trash" })),

                $("<button>", {
                  class: "btn btn-default",
                  onclick:
                    "$(this).orderDetails(" + index + "," + orderType + ")",
                }).append($("<span>", { class: "fa fa-shopping-basket" })),
              ),
            ),
          ),
        );
      });
    };

    $.fn.calculatePrice = function (data) {
      totalPrice = 0;
      $.each(data.products, function (index, product) {
        totalPrice += product.price * product.quantity;
      });

      let vat = (totalPrice * data.vat) / 100;
      totalPrice = (totalPrice + vat - data.discount).toFixed(0);

      return totalPrice;
    };

    $.fn.orderDetails = function (index, orderType) {
      $("#refNumber").val("");

      if (orderType == 1) {
        $("#refNumber").val(holdOrderList[index].ref_number);

        $("#customer option:selected").removeAttr("selected");

        $("#customer option")
          .filter(function () {
            return $(this).text() == "Walk in customer";
          })
          .prop("selected", true);

        holdOrder = holdOrderList[index]._id;
        cart = [];
        $.each(holdOrderList[index].items, function (index, product) {
          item = {
            id: product.id,
            product_name: product.product_name,
			category_name: product.category_name,
			manfacturer_name: product.manfacturer_name,
			batch_number:product.batch_number,
            sku: product.sku,
			buy_price:product.buy_price,
            price: product.price,
			cr_code:product.cr_code,
            quantity: product.quantity,
          };
          cart.push(item);
        });
      } else if (orderType == 2) {
        $("#refNumber").val("");

        $("#customer option:selected").removeAttr("selected");

        $("#customer option")
          .filter(function () {
            return $(this).text() == customerOrderList[index].customer.name;
          })
          .prop("selected", true);

        holdOrder = customerOrderList[index]._id;
        cart = [];
        $.each(customerOrderList[index].items, function (index, product) {
            item = {
            id: product.id,
            product_name: product.product_name,
			category_name: product.category_name,
			manfacturer_name: product.manfacturer_name,
			batch_number:product.batch_number,
            sku: product.sku,
			buy_price:product.buy_price,
            price: product.price,
			cr_code:product.cr_code,
            quantity: product.quantity,
          };
          cart.push(item);
        });
      }
      $(this).renderTable(cart);
      $("#holdOrdersModal").modal("hide");
      $("#customerModal").modal("hide");
    };

    $.fn.deleteOrder = function (index, type) {
      switch (type) {
        case 1:
          deleteId = holdOrderList[index]._id;
          break;
        case 2:
          deleteId = customerOrderList[index]._id;
      }

      let data = {
        orderId: deleteId,
      };
      let diagOptions = {
        title: "Delete order?",
        text: "This will delete the order. Are you sure you want to delete!",
        icon: "warning",
        showCancelButton: true,
        okButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        okButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.ajax({
            url: api + "delete",
            type: "POST",
            data: JSON.stringify(data),
            contentType: "application/json; charset=utf-8",
            cache: false,
            success: function (data) {
              $(this).getHoldOrders();
              $(this).getCustomerOrders();

              notiflix.Report.success(
                "Deleted!",
                "You have deleted the order!",
                "Ok",
              );
            },
            error: function (data) {
              $(".loading").hide();
            },
          });
        },
      );
    };

    $.fn.getCustomerOrders = function () {
      $.get(api + "customer-orders", function (data) {
        //clearInterval(dotInterval);
        customerOrderList = data;
        customerOrderLocation.empty();
        $(this).renderHoldOrders(customerOrderList, customerOrderLocation, 2);
      });
    };

    $("#saveCustomer").on("submit", function (e) {
      e.preventDefault();

      let custData = {
        _id: Math.floor(Date.now() / 1000),
        name: $("#userName").val(),
        phone: $("#phoneNumber").val(),
        email: $("#emailAddress").val(),
        address: $("#userAddress").val(),
      };

      $.ajax({
        url: api + "customers/customer",
        type: "POST",
        data: JSON.stringify(custData),
        contentType: "application/json; charset=utf-8",
        cache: false,
        processData: false,
        success: function (data) {
          $("#newCustomer").modal("hide");
          notiflix.Report.success(
            "Customer added!",
            "Customer added successfully!",
            "Ok",
          );
          $("#customer option:selected").removeAttr("selected");
          $("#customer").append(
            $("<option>", {
              text: custData.name,
              value: `{"id": ${custData._id}, "name": ${custData.name}}`,
              selected: "selected",
            }),
          );

          $("#customer")
            .val(`{"id": ${custData._id}, "name": ${custData.name}}`)
            .trigger("chosen:updated");
        },
        error: function (data) {
          $("#newCustomer").modal("hide");
          notiflix.Report.failure(
            "Error",
            "Something went wrong please try again",
            "Ok",
          );
        },
      });
    });

    $("#confirmPayment").hide();

    $("#cardInfo").hide();

    $("#payment").on("input", function () {
      $(this).calculateChange();
    });
    $("#confirmPayment").on("click", function () {
      if ($("#payment").val() == "") {
        notiflix.Report.warning(
          "Nope!",
          "Please enter the amount that was paid!",
          "Ok",
        );
      } else {
        $(this).submitDueOrder(1);
      }
    });

    $("#transactions").on("click", function () {
      loadTransactions();
      loadUserList();

      $("#pos_view").hide();
      $("#pointofsale").show();
      $("#transactions_view").show();
	  $("#transaction_details").show();
	  $("#Inventorylog_view").hide();
	  $("#transaction_detail").hide()
	  $("#sales_by_indproduct").hide();
	  $("#sales_by_product").show();
	  //$("#btnUnsoldItems").show();
      $(this).hide();
    });

    $("#pointofsale").on("click", function () {
      $("#pos_view").show();
      $("#transactions").show();
      $("#transactions_view").hide();
	  $("#Inventorylog_view").hide();
	  //$("#btnUnsoldItems").hide();
      $(this).hide();
    });
$("#inventorylogs").on("click", function () {
      //loadTransactions();
      //loadUserList();
      loadInventoryLogList();
	  loadAllInventoryFilters();
      $("#Inventorylog_view").show()
	  $("#pos_view").hide();
	  $("#transactions_view").hide();
      //$(this).hide();
    });
$("#transaction_detail").on("click", function () {
	   $("#transaction_detail").hide() 
	   $("#sales_by_product").show();
       $("#transaction_details").show();
       $("#sales_by_indproduct").hide();	   
});
$("#sales_by_product").on("click", function () { 
	   $("#sales_by_product").hide();
	   $("#transaction_detail").show()
       $("#transaction_details").hide();
       $("#sales_by_indproduct").show();	   
});

    $("#viewRefOrders").on("click", function () {
      setTimeout(function () {
        $("#holdOrderInput").focus();
      }, 500);
    });

    $("#viewCustomerOrders").on("click", function () {
      setTimeout(function () {
        $("#holdCustomerOrderInput").focus();
      }, 500);
    });
  
  function openNewProductForm() {
    // Clear all form fields
    document.getElementById("saveProduct").reset();

    // Remove the hidden ID and barcode if present
    document.getElementById("product_id").value = "";
    document.getElementById("barcode").value = "";
}

    $("#newProductModal").on("click", function () {
      $("#saveProduct").get(0).reset();
      $("#current_img").text("");
	    openNewProductForm();
    });

    $("#saveProduct").submit(function (e) {
      e.preventDefault();

      $(this).attr("action", api + "inventory/product");
      $(this).attr("method", "POST");

      $(this).ajaxSubmit({
        contentType: "application/json",
        success: function (response) {
					  if (response.status === "already_expired") {
          notiflix.Report.failure(
            "Expired!",
            "You are trying to stock an expired product,stop here!!",
            "Ok",
          );
	notiflix.Report.failure("");
    return;
  }
  		  if (response.status === "less_than_3month") {
          notiflix.Report.failure(
            "Risky!",
            "The product has expiry date of less than three months.",
            "Ok",
          );
	notiflix.Report.failure("");
    return;
  }
			  if (response.status === "duplicate") {
          notiflix.Report.failure(
            "Duplicate!",
            "A product with the same name, batch number, and manufacturer already exists.",
            "Ok",
          );
	notiflix.Report.failure("");
    return;
  }
  else if (response.status === "noupdate") {
          notiflix.Report.info(
            "No update!",
            "You did not change any field value, nothing updated.",
            "Ok",
          );
	notiflix.Report.failure("");
    return;
  }
			
          $("#saveProduct").get(0).reset();
          $("#current_img").text("");

          loadProducts();
          diagOptions = {
            title: "Product Saved",
            text: "Select an option below to continue.",
            okButtonText: "Add another",
            cancelButtonText: "Close",
          };

          notiflix.Confirm.show(
            diagOptions.title,
            diagOptions.text,
            diagOptions.okButtonText,
            diagOptions.cancelButtonText,
            ()=>{},
            () => {
              $("#newProduct").modal("hide");
			  openNewProductForm();
            },
          );
        },
        //error for product
       error: function (jqXHR,textStatus, errorThrown) {
      console.error(jqXHR.responseJSON.message);
      notiflix.Report.failure(
        jqXHR.responseJSON.error,
        jqXHR.responseJSON.message,
        "Ok",
      );
      }

      });
    });

     $("#saveCategory").submit(function (e) {
      e.preventDefault();

      if ($("#category_id").val() == "") {
        method = "POST";
      } else {
        method = "PUT";
      }

      $.ajax({
        type: method,
        url: api + "categories/category",
        data: $(this).serialize(),
	success: function (data, textStatus, jqXHR) {
  if (data.status === "duplicate") {
          notiflix.Report.failure(
            "Duplicate!",
            "A category with the same name already exists.",
            "Ok",
          );
	notiflix.Report.failure("");
    return;
  }

  // Reset the form
  $("#saveCategory").get(0).reset();
  loadCategories();

  // Show confirmation dialog
  diagOptions = {
    title: "Category Saved",
    text: "Select an option below to continue.",
    okButtonText: "Add another",
    cancelButtonText: "Close",
  };

  notiflix.Confirm.show(
    diagOptions.title,
    diagOptions.text,
    diagOptions.okButtonText,
    diagOptions.cancelButtonText,
    () => {},

    () => {
      $("#newCategory").modal("hide");
    },
  );
},
      });
    });
  
	
	//save manfacturer
	    $("#saveManfacturer").submit(function (e) {
      e.preventDefault();

      if ($("#manfacturer_id").val() == "") {
        method = "POST";
      } else {
        method = "PUT";
      }

      $.ajax({
        type: method,
        url: api + "manfacturers/manfacturer",
        data: $(this).serialize(),
	success: function (data, textStatus, jqXHR) {
  if (data.status === "duplicate") {
          notiflix.Report.failure(
            "Duplicate!",
            "A manufacturer with the same name already exists.",
            "Ok",
          );
	notiflix.Report.failure("");
    return;
  }

  // Reset the form
  $("#saveManfacturer").get(0).reset();
  loadManfacturers();

  // Show confirmation dialog
  diagOptions = {
    title: "Manfacturer Saved",
    text: "Select an option below to continue.",
    okButtonText: "Add another",
    cancelButtonText: "Close",
  };

  notiflix.Confirm.show(
    diagOptions.title,
    diagOptions.text,
    diagOptions.okButtonText,
    diagOptions.cancelButtonText,
    () => {},

    () => {
      $("#newManfacturer").modal("hide");
    },
  );
},
      });
    });
	//print barcode

 $.fn.printBarcode = function(productId) {
  const barcodeEl = document.querySelector(`#barcode_${productId}`);
  if (!barcodeEl) {
    alert("Barcode not found.");
    return;
  }

  const barcodeHTML = barcodeEl.outerHTML;

  const printWin = window.open('', '', 'width=400,height=300');
  printWin.document.write(`
    <html>
      <head>
        <title>Print Barcode</title>
        <style>
          body { text-align: center; font-family: Arial; margin-top: 50px; }
          svg { width: 80%; height: auto; }
        </style>
      </head>
      <body>
        ${barcodeHTML}
        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}


    $.fn.editProduct = function (index) {
      $("#Products").modal("hide");

      $("#category option")
        .filter(function () {
          return $(this).val() == allProducts[index].category;
        })
        .prop("selected", true);
		
	 $("#manfacturer option")
        .filter(function () {
          return $(this).val() == allProducts[index].manfacturer;
        })
        .prop("selected", true);
		//console.log(window.user_fullname);
	  $("#loggedin_user").val(window.user_fullname);	
      $("#productName").val(allProducts[index].name);
	  $("#batch_number").val(allProducts[index].batch_number);
	  $("#cr_code").val(allProducts[index].cr_code);
	  $("#purchase_price").val(allProducts[index].buy_price);
      $("#product_price").val(allProducts[index].price);
      $("#quantity").val(allProducts[index].quantity);
      $("#barcode").val(allProducts[index].barcode);
      $("#expirationDate").val(allProducts[index].expirationDate);
      $("#minStock").val(allProducts[index].minStock || 1);
      $("#product_id").val(allProducts[index]._id);
      $("#img").val(allProducts[index].img);
       //console.log("_id:",allProducts[index]._id);
	   //console.log("barcode:",allProducts[index].barcode);
      if (allProducts[index].img != "") {
        $("#imagename").hide();
        $("#current_img").html(
          `<img src="${img_path + allProducts[index].img}" alt="">`,
        );
        $("#rmv_img").show();
      }

      if (allProducts[index].stock == 0) {
        $("#stock").prop("checked", true);
      }

      $("#newProduct").modal("show");
    };

    $("#userModal").on("hide.bs.modal", function () {
      $(".perms").hide();
    });

    $.fn.editUser = function (index) {
      user_index = index;

      $("#Users").modal("hide");

      $(".perms").show();

      $("#user_id").val(allUsers[index]._id);
	  $("#user_status").val(allUsers[index].status);
      $("#fullname").val(allUsers[index].fullname);
      $("#username").val(validator.unescape(allUsers[index].username));
      //$(".hide_password").hide();
      //$(".hide_pass").hide();

      for (perm of permissions) {
        var el = "#" + perm;
        if (allUsers[index][perm] == 1) {
          $(el).prop("checked", true);
        } else {
          $(el).prop("checked", false);
        }
      }

      $("#userModal").modal("show");
    };

    $.fn.editCategory = function (index) {
	  
      $("#Categories").modal("hide");
      $("#categoryName").val(allCategories[index].name);
      $("#category_id").val(allCategories[index]._id);
      $("#newCategory").modal("show");
    };
	
	    $.fn.editManfacturer = function (index_) {
			console.log(allManfacturers[index_].name,allManfacturers[index_]._id);
      $("#Manfacturers").modal("hide");
      $("#manfacturerName").val(allManfacturers[index_].name);
      $("#manfacturer_id").val(allManfacturers[index_]._id);
      $("#newManfacturer").modal("show");
    };

    $.fn.deleteProduct = function (id) {
      diagOptions = {
        title: "Are you sure?",
        text: "You are about to delete this product.",
        okButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
			$.ajax({
			  url: api + "inventory/product/delete",
			  type: "POST",
			  data: {
				id: id,
				user: $("#loggedin-user").text()
			  },
			  success: function (result) {
				loadProducts();
				notiflix.Report.success("Done!", "Product deleted", "Ok");
			  },
			  error: function (xhr, status, error) {
				notiflix.Report.failure("Error", "Failed to delete product", "Ok");
				console.error("Delete error:", error);
			  }
			});

		  
        },
      );
    };

    $.fn.deleteUser = function (id) {
      diagOptions = {
        title: "Are you sure?",
        text: "You are about to delete this user.",
        cancelButtonColor: "#d33",
        okButtonText: "Yes, delete!",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.ajax({
            url: api + "users/user/" + id,
            type: "DELETE",
            success: function (result) {
              loadUserList();
              notiflix.Report.success("Done!", "User deleted", "Ok");
            },
          });
        },
      );
    };

    $.fn.deleteCategory = function (id) {
      diagOptions = {
        title: "Are you sure?",
        text: "You are about to delete this category.",
        okButtonText: "Yes, delete it!",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.ajax({
            url: api + "categories/category/" + id,
            type: "DELETE",
            success: function (result) {
              loadCategories();
              notiflix.Report.success("Done!", "Category deleted", "Ok");
            },
          });
        },
      );
    };
	    $.fn.deleteManfacturer = function (id) {
      diagOptions = {
        title: "Are you sure?",
        text: "You are about to delete this manfacturer.",
        okButtonText: "Yes, delete it!",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.ajax({
            url: api + "manfacturers/manfacturer/" + id,
            type: "DELETE",
            success: function (result) {
              loadManfacturers();
              notiflix.Report.success("Done!", "Manfacturer deleted", "Ok");
            },
          });
        },
      );
    };

    $("#productModal").on("click", function () {
      loadProductList();
    });

    $("#usersModal").on("click", function () {
      loadUserList();
    });

    $("#categoryModal").on("click", function () {
      loadCategoryList();
    });
	$("#manfacturerModal").on("click", function () {
      loadCategoryList();
    });

    function loadUserList() {
      let counter = 0;
      let user_list = "";
      $("#user_list").empty();
      $("#userList").DataTable().destroy();

      $.get(api + "users/all", function (users) {
        allUsers = [...users];

        users.forEach((user, index) => {
          state = [];
          let class_name = "";

          if (user.status != "") {
            state = user.status.split("_");
            login_status = state[0];
            login_time = state[1];

            switch (login) {
              case "Logged In":
                class_name = "btn-default";

                break;
              case "Logged Out":
                class_name = "btn-light";
                break;
            }
          }

          counter++;
          user_list += `<tr>
            <td>${user.fullname}</td>
            <td>${user.username}</td>
            <td class="${class_name}">${
              state.length > 0 ? login_status : ""
            } <br><small> ${state.length > 0 ? login_time : ""}</small></td>
            <td>${
              user._id == 1
                ? '<span class="btn-group"><button class="btn btn-dark"><i class="fa fa-edit"></i></button><button class="btn btn-dark"><i class="fa fa-trash"></i></button></span>'
                : '<span class="btn-group"><button onClick="$(this).editUser(' +
                  index +
                  ')" class="btn btn-warning"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteUser(' +
                  user._id +
                  ')" class="btn btn-danger"><i class="fa fa-trash"></i></button></span>'
            }</td></tr>`;

          if (counter == users.length) {
            $("#user_list").html(user_list);

            $("#userList").DataTable({
              order: [[1, "desc"]],
              autoWidth: false,
              info: true,
              JQueryUI: true,
              ordering: true,
              paging: false,
            });
          }
        });
      });
    }

	
	function loadInventoryLogList(){
		//console.log($('#reportrange').val());
		let persons= [];
		let events = [];
		let reasons = [];
	const by_person = $('#persons').val();
	const by_event = $('#events').val();
	const by_reason = $('#reasons').val();
	let query=[];
	    if (start_date) {
        query.push(`start=${start_date}`);
    }
    if (end_date) {
        query.push(`end=${end_date}`);
    }
	if(by_person){
	query.push(`person=${encodeURIComponent(by_person)}`);
	}
	if(by_event){
	query.push(`_event=${encodeURIComponent(by_event)}`);
	}
	if(by_reason){
	query.push(`reason=${encodeURIComponent(by_reason)}`);
	}
  let queryString = query.length > 0 ? "?" + query.join("&") : "";
//let query = `by-date?start=${start_date}&end=${end_date}&user=${by_person}&_event=${by_event}&reason=${by_reason}`;
     $.get(api + "inventory/inventory_log"+queryString, function (data) {
	 allInventoryLogs = data;
	 //console.log("overall Data:",allInventoryLogs);
		let inventorylog_list = "";
		let counter = 0;

	  $("#inventorylog_list").empty();
      $("#InventoryLogList").DataTable().destroy();
	  
	//allInventoryLogs.sort((a, b) => b.Date-a.Date);
	allInventoryLogs.forEach((inventoryLog,index)=>{
		counter++;
		//console.log("Date:",inventoryLog.Date);
	let category = allCategories.filter(function (category) {
          return category._id == inventoryLog.category;
        });
	   let manfacturer = allManfacturers.filter(function (manfacturer) {
          return manfacturer._id == inventoryLog.manfacturer;
        });
		//console.log(inventoryLog.Date);
		const formattedDate = new Date(inventoryLog.Date).toLocaleString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		}).replace(/,/g, '');
		//console.log(formattedDate);
           if (!persons.includes(inventoryLog.user)) {
          persons.push(inventoryLog.user);
        }
		   if (!events.includes(inventoryLog._event)) {
          events.push(inventoryLog._event);
        }
		   if (!reasons.includes(inventoryLog.reason)) {
          reasons.push(inventoryLog.reason);
        }
		inventorylog_list +=
		`<tr>
		<td>${inventoryLog.name}</td>
		<td>${manfacturer.length > 0 ? manfacturer[0].name : ""}</td>
		<td>${inventoryLog.batch_number}</td>
		<td>${inventoryLog.expirationDate}</td>
		<td>${inventoryLog.quantity}</td>
		<td>${inventoryLog.buy_price}</td>
		<td>${inventoryLog._event}</td>
		<td>${inventoryLog.reason}</td>
		<td>${inventoryLog.changes_made}</td>
		<td>${inventoryLog.user}</td>
        <td>${formattedDate}</td>
		</tr>`
	});
	    if (counter == allInventoryLogs.length) {
          $("#inventorylog_list").html(inventorylog_list);          
		}
	$("#InventoryLogList").DataTable({
        order: [[1, "desc"]],
        autoWidth: false,
        info: true,
        JQueryUI: true,
        ordering: true,
        paging: false,
        dom: "Bfrtip",
		columnDefs:[
		{width:"8%",targets:0},
		{width:"8%",targets:3},
		{width:"3%",targets:4},
		{width:"15%",targets:7},
		{width:"25%",targets:8},
		{width:"10%",targets:10}		
		],
        buttons: [
			  {
				extend: "pdfHtml5",
				className: "btn btn-light",
				text: " Download PDF",
				filename: "inventorylog_list",
				orientation: "landscape", // <-- This sets the orientation
				pageSize: "A4",            // Optional: can use 'A3' for more width
				exportOptions: {
				  columns: ':visible'     // Optional: ensures only visible columns are exported
				},
				customize: function (doc) {
				    doc.content.splice(0, 1, {
					  text: "Inventory Log Report",
					  fontSize: 16,
					  alignment: "center",
					  margin: [0, 0, 0, 12], // [left, top, right, bottom]
					});
				  doc.styles.tableHeader.alignment = 'left';
				  doc.styles.tableHeader.fontSize = 10;
				  doc.defaultStyle.fontSize = 9; // Optional: control overall font size
	              //doc.content[1].table.widths = ["9%","10%","10%","9%","11%","5%","8%","6%","9%","18%","7%","8%"];
				}
			  }
			],
      });
	});}
	
	function loadAllInventoryFilters() {
    $.get(api + "inventory/inventory_log/all_filters", function(data) {
		//console.log("All filters:",data);
        if (data.persons) {
            loadPerson(data.persons);
        }
        if (data.events) {
            loadEvent(data.events);
        }
        if (data.reasons) {
            loadReason(data.reasons);
        }
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error("Error loading all filter options:", textStatus, errorThrown);
        // Optionally, display a user-friendly error message
    });
}
	
	
	function loadPerson(persons){
    //const selectedPerson = $("#persons").val(); // Save current selection
	$("#persons").html(`<option value="0">All</option>`);
    persons.forEach(person => {
        $("#persons").append(`<option value="${person}">${person}</option>`);
    });
    //$("#persons").val(selectedPerson); // Restore previous selection
}

function loadReason(reasons){
    //const selectedReason = $("#reasons").val();
    $("#reasons").empty().html(`<option value="0">All</option>`);
    reasons.forEach(reason => {
        $("#reasons").append(`<option value="${reason}">${reason}</option>`);
    });
    //$("#reasons").val(selectedReason);
}

function loadEvent(events){
    //const selectedEvent = $("#events").val();
    $("#events").empty().html(`<option value="0">All</option>`);
    events.forEach(_event => {
        $("#events").append(`<option value="${_event}">${_event}</option>`);
    });
    //$("#events").val(selectedEvent);
}

	
	$("#reasons").on("change", function () {
  by_reason = $(this).find("option:selected").val();
  loadInventoryLogList();
});
	$("#persons").on("change", function () {
  by_person = $(this).find("option:selected").val();
  loadInventoryLogList();
});
	$("#events").on("change", function () {
  by_event = $(this).find("option:selected").val();
  loadInventoryLogList();
});

$("#reportrangeInventoryLog").on("apply.daterangepicker", function (ev, picker) {
  start = picker.startDate.format("DD MMM YYYY hh:mm A");
  end = picker.endDate.format("DD MMM YYYY hh:mm A");

  start_date = picker.startDate.toDate().toJSON();
  end_date = picker.endDate.toDate().toJSON();

  loadInventoryLogList();
});


    $("#log-out").on("click", function () {
      const diagOptions = {
        title: "Are you sure?",
        text: "You are about to log out.",
        cancelButtonColor: "#3085d6",
        okButtonText: "Logout",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.get(api + "users/logout/" + user._id, function (data) {
            storage.delete("auth");
            storage.delete("user");
            ipcRenderer.send("app-reload", "");
          });
        },
      );
    });

    $("#settings_form").on("submit", function (e) {
      e.preventDefault();
      let formData = $(this).serializeObject();
      let mac_address;

      api = "http://" + host + ":" + port + "/api/";

      macaddress.one(function (err, mac) {
        mac_address = mac;
      });
      const appChoice = $("#app").find("option:selected").text();
    
      formData["app"] = appChoice;
      formData["mac"] = mac_address;
      formData["till"] = 1;

      // Update application field in settings form
      let $appField = $("#settings_form input[name='app']");
      let $hiddenAppField = $('<input>', {
        type: 'hidden',
        name: 'app',
        value: formData.app
    });
        $appField.length 
            ? $appField.val(formData.app) 
            : $("#settings_form").append(`<input type="hidden" name="app" value="${$hiddenAppField}" />`);


      if (formData.percentage != "" && typeof formData.percentage === 'number') {
        notiflix.Report.warning(
          "Oops!",
          "Please make sure the tax value is a number",
          "Ok",
        );
      } else {
        storage.set("settings", formData);

        $(this).attr("action", api + "settings/post");
        $(this).attr("method", "POST");

        $(this).ajaxSubmit({
          contentType: "application/json",
          success: function () {
            ipcRenderer.send("app-reload", "");
          },
          error: function (jqXHR) {
            console.error(jqXHR.responseJSON.message);
            notiflix.Report.failure(
              jqXHR.responseJSON.error,
              jqXHR.responseJSON.message,
              "Ok",
            );
      }
    });
    }
  });

    $("#net_settings_form").on("submit", function (e) {
      e.preventDefault();
      let formData = $(this).serializeObject();

      if (formData.till == 0 || formData.till == 1) {
        notiflix.Report.warning(
          "Oops!",
          "Please enter a number greater than 1.",
          "Ok",
        );
      } else {
        if (isNumeric(formData.till)) {
          formData["app"] = $("#app").find("option:selected").text();
          storage.set("settings", formData);
          ipcRenderer.send("app-reload", "");
        } else {
          notiflix.Report.warning(
            "Oops!",
            "Till number must be a number!",
            "Ok",
          );
        }
      }
    });
	//
	  function openNewUserForm() {
    // Clear all form fields
    document.getElementById("saveUser").reset();

    // Remove the hidden ID if present
    document.getElementById("user_id").value = "";
		}

    $("#saveUser").on("submit", function (e) {
      e.preventDefault();
      let formData = $(this).serializeObject();

      if (formData.password != formData.pass) {
        notiflix.Report.warning("Oops!", "Passwords do not match!", "Ok");
      }

      if (
        bcrypt.compare(formData.password, user.password) ||
        bcrypt.compare(formData.password, allUsers[user_index].password)
      ) {
        $.ajax({
          url: api + "users/post",
          type: "POST",
          data: JSON.stringify(formData),
          contentType: "application/json; charset=utf-8",
          cache: false,
          processData: false,
          success: function (data) {
            if (ownUserEdit) {
              ipcRenderer.send("app-reload", "");
            } else {
              $("#userModal").modal("hide");
              loadUserList();
              openNewUserForm();
              $("#Users").modal("show");
              notiflix.Report.success("Great!", "User details saved!", "Ok");
            }
          },
          error: function (jqXHR,textStatus, errorThrown) {
            notiflix.Report.failure(
              jqXHR.responseJSON.error,
              jqXHR.responseJSON.message,
              "Ok",
            );
          },
        });
      }
    });

    $("#app").on("change", function () {
      if (
        $(this).find("option:selected").text() ==
        "Network Point of Sale Terminal"
      ) {
        $("#net_settings_form").show(500);
        $("#settings_form").hide(500);
        macaddress.one(function (err, mac) {
          $("#mac").val(mac);
        });
      } else {
        $("#net_settings_form").hide(500);
        $("#settings_form").show(500);
      }
    });

    $("#cashier").on("click", function () {
      ownUserEdit = true;

      $("#userModal").modal("show");
      $("#user_id").val(user._id);
      $("#fullname").val(user.fullname);
      $("#username").val(user.username);
      $("#password").attr("placeholder", "New Password");

      for (perm of permissions) {
        var el = "#" + perm;
        if (allUsers[index][perm] == 1) {
          $(el).prop("checked", true);
        } else {
          $(el).prop("checked", false);
        }
      }
    });
	

    $("#add-user").on("click", function () {
      if (platform.app != "Network Point of Sale Terminal") {
        $(".perms").show();
      }

      $("#saveUser").get(0).reset();
	   openNewUserForm();
      $("#userModal").modal("show");
    });

    $("#settings").on("click", function () {
      if (platform.app == "Network Point of Sale Terminal") {
        $("#net_settings_form").show(500);
        $("#settings_form").hide(500);

        $("#ip").val(platform.ip);
        $("#till").val(platform.till);

        macaddress.one(function (err, mac) {
          $("#mac").val(mac);
        });

        $("#app option")
          .filter(function () {
            return $(this).text() == platform.app;
          })
          .prop("selected", true);
      } else {
        $("#net_settings_form").hide(500);
        $("#settings_form").show(500);

        $("#settings_id").val("1");
        $("#store").val(validator.unescape(settings.store));
        $("#address_one").val(validator.unescape(settings.address_one));
        $("#address_two").val(validator.unescape(settings.address_two));
        $("#contact").val(validator.unescape(settings.contact));
        $("#tax").val(validator.unescape(settings.tax));
        $("#symbol").val(validator.unescape(settings.symbol));
        $("#percentage").val(validator.unescape(settings.percentage));
        $("#footer").val(validator.unescape(settings.footer));
        $("#logo_img").val(validator.unescape(settings.img));
        if (settings.charge_tax) {
          $("#charge_tax").prop("checked", true);
        }
        if (validator.unescape(settings.img) != "") {
          $("#logoname").hide();
          $("#current_logo").html(
            `<img src="${img_path + validator.unescape(settings.img)}" alt="">`,
          );
          $("#rmv_logo").show();
        }

        $("#app option")
          .filter(function () {
            return $(this).text() == validator.unescape(settings.app);
          })
          .prop("selected", true);
      }
    });
 });

  $("#rmv_logo").on("click", function () {
    $("#remove_logo").val("1");
    // $("#logo_img").val('');
    $("#current_logo").hide(500);
    $(this).hide(500);
    $("#logoname").show(500);
  });

  $("#rmv_img").on("click", function () {
    $("#remove_img").val("1");
    // $("#img").val('');
    $("#current_img").hide(500);
    $(this).hide(500);
    $("#imagename").show(500);
  });
}

$.fn.print = function () {
  printJS({ printable: receipt, type: "raw-html" });
};

function loadTransactions() {
  let tills = [];
  let users = [];
  let sales = 0;
  let profit = 0;
  let transact = 0;
  let unique = 0;

  sold_items = [];
  sold = [];

  let counter = 0;
  let transaction_list = "";
  let query = `by-date?start=${start_date}&end=${end_date}&user=${by_user}&status=${by_status}&till=${by_till}`;

  $.get(api + query, function (transactions) {
    if (transactions.length > 0) {
      $("#transaction_list").empty();
      $("#transactionList").DataTable().destroy();

      allTransactions = [...transactions];

      transactions.forEach((trans, index) => {
        sales += parseFloat(trans.total);
		profit += parseFloat(trans.subtotal_profit)
        transact++;

        trans.items.forEach((item) => {
          sold_items.push(item);
        });

        if (!tills.includes(trans.till)) {
          tills.push(trans.till);
        }

        if (!users.includes(trans.user_id)) {
          users.push(trans.user_id);
        }

        counter++;
        transaction_list += `<tr>
                                <td>${trans.order}</td>
                                <td class="nobr">${moment(trans.date).format(
                                  "DD-MMM-YYYY HH:mm:ss",
                                )}</td>
                                <td>${
                                  moneyFormat(trans.total) + validator.unescape(settings.symbol)
                                }</td>
                                <td>${
                                  trans.paid == ""
                                    ? ""
                                    : moneyFormat(trans.paid) + validator.unescape(settings.symbol) 
                                }</td>
                                <td>${
                                  trans.change
                                    ?   moneyFormat(
                                        Math.abs(trans.change).toFixed(2),
                                      )+
									validator.unescape(settings.symbol)
                                    : ""
                                }</td>
                                <td>${
                                  trans.paid == ""
                                    ? ""
                                    : trans.payment_type
                                }</td>
                                <td>${trans.till}</td>
                                <td>${trans.user}</td>
                                <td>${
                                  trans.paid == ""
                                    ? '<button class="btn btn-dark"><i class="fa fa-search-plus"></i></button>'
                                    : '<button onClick="$(this).viewTransaction(' +
                                      index +
                                      ')" class="btn btn-info"><i class="fa fa-search-plus"></i></button></td>'
                                }</tr>
                    `;

        if (counter == transactions.length) {
          $("#total_sales #counter").text(
            moneyFormat(parseFloat(sales).toFixed(2)) + validator.unescape(settings.symbol),
          );
		  window.totalsales = sales;
		  window.totalProfit_ = profit;
		  $("#total_profit #counter").text(
            moneyFormat(parseFloat(profit).toFixed(2)) + validator.unescape(settings.symbol),
          );
		  $("#total_profit").click(function(){
			  $("#total_profitModal").show();
		  });
          $("#total_transactions #counter").text(transact);

          const result = {};

          for (const { product_name,category_name,manfacturer_name,batch_number, buy_price, price, quantity, id } of sold_items) {
            if (!result[product_name]) result[product_name] = [];
            result[product_name].push({ id, price, quantity,buy_price,category_name,manfacturer_name,batch_number});
          }

          for (item in result) {
            let price = 0;
            let quantity = 0;
            let id = 0;

            result[item].forEach((i) => {
              id = i.id;
              price = i.price;
			  buy_price = i.buy_price;
              quantity = quantity + parseInt(i.quantity);
			  category_name = i.category_name; 
			  manfacturer_name = i.manfacturer_name; 
			  batch_number = i.batch_number;
            });
            sold.push({
              id: id,
              product: item,
              qty: quantity,
              price: price,
			  buy_price:buy_price,
			  category:category_name,
			  manfacturer:manfacturer_name, 
			  batch:batch_number,
            });
          }

          loadSoldProducts();

          if (by_user == 0 && by_till == 0) {
            userFilter(users);
            tillFilter(tills);
          }

          $("#transaction_list").html(transaction_list);
          $("#transactionList").DataTable({
            order: [[1, "desc"]],
            autoWidth: false,
            info: true,
            JQueryUI: true,
            ordering: true,
            paging: true,
            dom: "Bfrtip",
            buttons: ["csv", "excel", "pdf"],
          });
        }
      });
    } else {
		//console.log("Partial loss:",window.totalLoss);
      notiflix.Report.warning(
        "No data!",
        "No transactions available within the selected criteria",
        "Ok",
      );
    }
  });
  
}
//load monthly total sales summary Report
     function loadMonthlySales(){
		 $.get(api+"report/sales-summary"+query)
	 }

function sortDesc(a, b) {
  if (a.qty > b.qty) {
    return -1;
  }
  if (a.qty < b.qty) {
    return 1;
  }
  return 0;
}

function loadSoldProducts() {
  sold.sort(sortDesc);

  let counter = 0;
  let sold_list = "";
  let items = 0;
  let products = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let expiredUnsoldLoss = 0;
  const today = moment(); // current date
  const soldProductIds = sold.map(item => item.id);

  // Clear UI
  $("#product_sales").empty();
  $("#productsSold").DataTable().destroy();
  $("#unsold_products").empty();
  $("#unsoldExpiredTable").DataTable().destroy();
  $("#unsoldExpiredLoss").text("0");
  $("#Partialsold_products").empty();
  $("#PartialsoldExpiredTable").DataTable().destroy();
  $("#PartialsoldExpiredLoss").text("0");
  sold.forEach((item, index) => {
    items += parseInt(item.qty);
    products++;

    let product = allProducts.find(p => p._id == item.id);

    let itemProfit = 0;
    let itemLoss = 0;

    if (product) {
      const buyPrice = parseFloat(product.buy_price);
      const sellingPrice = parseFloat(item.price);
      const soldQty = parseInt(item.qty);
      const stockQty = parseInt(product.quantity) || 0;

      // Profit from sold quantity
      itemProfit = (sellingPrice - buyPrice) * soldQty;

      // Loss from expired remaining quantity
      if (
        product.stock == 1 &&
        product.expirationDate &&
        stockQty > 0 &&
        moment(product.expirationDate, "DD-MMM-YYYY").isBefore(today)
      ) {
        itemLoss = buyPrice * stockQty;
      }
    }
	else{
	  const buyPrice = parseFloat(item.buy_price);
      const sellingPrice = parseFloat(item.price);
      const soldQty = parseInt(item.qty);
      const stockQty = 0;//parseInt(product.quantity) || 0;

      // Profit from sold quantity
      itemProfit = (sellingPrice - buyPrice) * soldQty;
      itemLoss = 0;
      // Loss from expired remaining quantity
      /*if (
        product.stock == 1 &&
        product.expirationDate &&
        stockQty > 0 &&
        moment(product.expirationDate, "DD-MMM-YYYY").isBefore(today)
      ) {
        itemLoss = buyPrice * stockQty;
      }*/
	}

    totalProfit += itemProfit;
    totalLoss += itemLoss;
    let manfacturer = allManfacturers.filter(function (manfacturer) {
      return manfacturer.name == item.manfacturer;
    });
    sold_list += `<tr>
      <td>${item.product}</td>
	  <td>${item.batch}</td>
    <td>${item.manfacturer}</td>
	<td>${item.category}</td>
      <td>${item.qty}</td>
      <td>${product && product.stock == 1 ? product.quantity : "0"}</td>
      <td>${moneyFormat((item.qty * parseFloat(item.price)).toFixed(2))}${validator.unescape(settings.symbol)}</td>
      <td>${moneyFormat(itemProfit.toFixed(2))}${validator.unescape(settings.symbol)}</td>
      <td>${moneyFormat(itemLoss.toFixed(2))}${validator.unescape(settings.symbol)}</td>
    </tr>`;

    counter++;
  });

  
  //filter partially sold & expired products
  const PartialsoldList = allProducts.filter(prod => {
  return (
    soldProductIds.includes(prod._id) &&
    prod.expirationDate &&
    prod.batch_number &&
    parseInt(prod.quantity) > 0 &&
    moment(prod.expirationDate, "DD-MMM-YYYY").isBefore(today)
  );
});

let PartialSoldLoss = 0;
let partialsoldHTML = "";

PartialsoldList.forEach(prod => {
  // Derive initialQuantity if not stored
  let initialQty = parseInt(prod.initialQuantity);
  if (!initialQty || isNaN(initialQty)) {
    const soldQty = sold
      .filter(s => s.id === prod._id)
      .reduce((sum, s) => sum + parseInt(s.qty), 0);
    initialQty = soldQty + parseInt(prod.quantity);
  }

  const remainingQty = parseInt(prod.quantity);
  const costPerUnit = parseFloat(prod.buy_price);
  const loss = remainingQty * costPerUnit;
  PartialSoldLoss += loss;

  partialsoldHTML += `
    <tr>
      <td>${prod.name}</td>
      <td>${prod.batch_number || "N/A"}</td>
      <td>${initialQty}</td>
      <td>${remainingQty}</td>
      <td>${prod.expirationDate}</td>
      <td>${moneyFormat(costPerUnit.toFixed(2))}${validator.unescape(settings.symbol)}</td>
      <td>${moneyFormat(loss.toFixed(2))}${validator.unescape(settings.symbol)}</td>
    </tr>
  `;
});
  // Check for expired unsold drugs
  const expiredUnsoldList = allProducts.filter(prod => {
    return (
      !soldProductIds.includes(prod._id) &&
      prod.stock == 1 &&
      prod.expirationDate &&
	  prod.batch_number &&
      parseInt(prod.quantity) > 0 &&
      moment(prod.expirationDate, "DD-MMM-YYYY").isBefore(today)
    );
  });
  let unsoldHTML = "";
  expiredUnsoldList.forEach(prod => {
    const qty = parseInt(prod.quantity);
    const cost = parseFloat(prod.buy_price);
    const loss = qty * cost;
    expiredUnsoldLoss += loss;

    unsoldHTML += `<tr>
      <td>${prod.name}</td>
      <td>${prod.batch_number || "N/A"}</td>
      <td>${qty}</td>
	  <td>${qty}</td>
      <td>${prod.expirationDate}</td>
      <td>${moneyFormat(cost.toFixed(2))}${validator.unescape(settings.symbol)}</td>
      <td>${moneyFormat(loss.toFixed(2))}${validator.unescape(settings.symbol)}</td>
    </tr>`;
  });

  // Update UI
  let overallloss = totalLoss + expiredUnsoldLoss;
  let netprofit = window.totalProfit_ - overallloss;
  $("#total_items #counter").text(items);
  $("#total_products #counter").text(products);
   window.totalLoss=totalLoss;
  if(totalLoss>0){
document.getElementById('partial_loss').classList.remove('bg-primary');
document.getElementById('partial_loss').classList.add('bg-danger');
$("#partial_loss #counter").text(moneyFormat(totalLoss.toFixed(2)) + validator.unescape(settings.symbol));
//$("#btnPartialsoldItems").show;
  }
  else {
document.getElementById('partial_loss').classList.remove('bg-danger');
document.getElementById('partial_loss').classList.add('bg-primary');
$("#partial_loss #counter").text(moneyFormat(totalLoss.toFixed(2)) + validator.unescape(settings.symbol));
//$("#btnPartialsoldItems").hide();
  }
  
  $("#product_sales").html(sold_list);
	$("#productsSold").DataTable({
	order: [[1, "desc"]],
	autoWidth: false,
	info: true,
	JQueryUI: true,
	ordering: true,
	paging: true,
	dom: "Bfrtip",
	buttons: ["csv", "excel", "pdf"],
  });
  $("#unsold_products").html(unsoldHTML);
  $("#unsoldloss").click(function(){
 $("#unsoldExpiredModal").show();
	});
    $("#unsoldExpiredTable").DataTable({
     order: [[1, "desc"]],
	autoWidth: false,
	info: true,
	JQueryUI: true,
	ordering: true,
	paging: true,
	dom: "Bfrtip",
	buttons: ["csv", "excel", "pdf"],
      });
	 
  $("#Partialsold_products").html(partialsoldHTML);
  $("#PartialsoldExpiredTable").DataTable({
     order: [[1, "desc"]],
	autoWidth: false,
	info: true,
	JQueryUI: true,
	ordering: true,
	paging: true,
	dom: "Bfrtip",
	buttons: ["csv", "excel", "pdf"],
      });
	  
  let all_profit= parseInt($("#total_profit #counter").text());
  //console.log("all profit:",all_profit);
   if(all_profit>0)
  {
document.getElementById('total_profit').classList.remove('bg-danger,bg-warning,bg-success');
if(all_profit >= parseInt(window.totalsales)*25/100)
{
document.getElementById('total_profit').classList.remove('bg-warning,bg-danger');
document.getElementById('total_profit').classList.add('bg-success');
}
else{
document.getElementById('total_profit').classList.remove('bg-danger,bg-success');
document.getElementById('total_profit').classList.add('bg-warning'); 
  }
 }
  else{
document.getElementById('total_profit').classList.remove('bg-danger,bg-warning,bg-success');
	  document.getElementById('total_profit').classList.add('bg-danger');
  }
  
  if(netprofit>0)
  {
document.getElementById('netprofit').classList.remove('bg-danger,bg-warning,bg-success');
if(netprofit >= parseInt(window.totalsales)*20/100)
{
document.getElementById('netprofit').classList.remove('bg-warning,bg-danger');
document.getElementById('netprofit').classList.add('bg-success');
$("#netprofit #counter").text(moneyFormat(netprofit.toFixed(2)) + validator.unescape(settings.symbol));
}
else{
document.getElementById('netprofit').classList.remove('bg-success,bg-danger');
document.getElementById('netprofit').classList.add('bg-warning');
	  $("#netprofit #counter").text(moneyFormat(netprofit.toFixed(2)) + validator.unescape(settings.symbol));
  }
 }
  else{
document.getElementById('netprofit').classList.remove('bg-warning,bg-success');
	  document.getElementById('netprofit').classList.add('bg-danger');
	  $("#netprofit #counter").text(moneyFormat(netprofit.toFixed(2)) + validator.unescape(settings.symbol));
  }
  
  if(expiredUnsoldLoss>0){
	document.getElementById('unsoldloss').classList.remove('bg-success');
	document.getElementById('unsoldloss').classList.add('bg-danger');
$("#unsoldloss #counter").text(moneyFormat(expiredUnsoldLoss.toFixed(2)) + validator.unescape(settings.symbol));
 
  }
  else{
	 document.getElementById('unsoldloss').classList.remove('bg-danger');
	document.getElementById('unsoldloss').classList.add('bg-primary');
$("#unsoldloss #counter").text(moneyFormat(expiredUnsoldLoss.toFixed(2)) + validator.unescape(settings.symbol));
//$("#btnUnsoldItems").hide();
  }
  
if(overallloss>0){
	document.getElementById('overallloss').classList.remove('bg-primary');
	document.getElementById('overallloss').classList.add('bg-danger');
$("#overallloss #counter").text(moneyFormat(overallloss.toFixed(2)) + validator.unescape(settings.symbol));
}
else{
	document.getElementById('overallloss').classList.remove('bg-danger');
	document.getElementById('overallloss').classList.add('bg-primary');
$("#overallloss #counter").text(moneyFormat(overallloss.toFixed(2)) + validator.unescape(settings.symbol));
}


  $("#unsoldExpiredLoss").text(moneyFormat(expiredUnsoldLoss.toFixed(2)) + validator.unescape(settings.symbol));
  $("#PartialsoldExpiredLoss").text(moneyFormat(PartialSoldLoss.toFixed(2)) + validator.unescape(settings.symbol));
}


function userFilter(users) {
  $("#users").empty();
  $("#users").append(`<option value="0">All</option>`);

  users.forEach((user) => {
    let u = allUsers.filter(function (usr) {
      return usr._id == user;
    });

    $("#users").append(`<option value="${user}">${u[0].fullname}</option>`);
  });
}

function tillFilter(tills) {
  $("#tills").empty();
  $("#tills").append(`<option value="0">All</option>`);
  tills.forEach((till) => {
    $("#tills").append(`<option value="${till}">${till}</option>`);
  });
}

$.fn.viewTransaction = function (index) {
  transaction_index = index;

  let discount = allTransactions[index].discount;
  let customer =
    allTransactions[index].customer == 0
      ? "Walk in Customer"
      : allTransactions[index].customer.username;
  let refNumber =
    allTransactions[index].ref_number != ""
      ? allTransactions[index].ref_number
      : allTransactions[index].order;
  let orderNumber = allTransactions[index].order;
  let paymentMethod = "";
  let tax_row = "";
  let items = "";
  let products = allTransactions[index].items;

  products.forEach((item) => {
    items += `<tr><td>${item.product_name}</td><td>${
      item.quantity
    } </td><td class="text-right">${moneyFormat(
      Math.abs(item.price).toFixed(2),
    )} ${validator.unescape(settings.symbol)}  </td></tr>`;
  });

  paymentMethod = allTransactions[index].payment_type;
 

  if (allTransactions[index].paid != "") {
    payment = `<tr>
                    <td>Paid</td>
                    <td>:</td>
                    <td class="text-right">${moneyFormat(
                      Math.abs(allTransactions[index].paid).toFixed(2),
                    )} ${validator.unescape(settings.symbol)} </td>
                </tr>
                <tr>
                    <td>Change</td>
                    <td>:</td>
                    <td class="text-right">${moneyFormat(
                      Math.abs(allTransactions[index].change).toFixed(2),
                    )} ${validator.unescape(settings.symbol)} </td>
                </tr>
                <tr>
                    <td>Method</td>
                    <td>:</td>
                    <td class="text-right">${paymentMethod}</td>
                </tr>`;
  }

  if (settings.charge_tax) {
    tax_row = `<tr>
                <td>Vat(${validator.unescape(settings.percentage)})% </td>
                <td>:</td>
                <td class="text-right">${parseFloat(
                  allTransactions[index].tax,
                ).toFixed(2)} ${validator.unescape(settings.symbol)}</td>
            </tr>`;
  }

    logo = path.join(img_path, validator.unescape(settings.img));
      
      receipt = `<div style="font-size: 10px">                            
        <p style="text-align: center;">
        ${
          checkFileExists(logo)
            ? `<img style='max-width: 50px' src='${logo}' /><br>`
            : ``
        }
            <span style="font-size: 22px;">${validator.unescape(settings.store)}</span> <br>
            ${validator.unescape(settings.address_one)} <br>
            ${validator.unescape(settings.address_two)} <br>
            ${
              validator.unescape(settings.contact) != "" ? "Tel: " + validator.unescape(settings.contact) + "<br>" : ""
            } 
            ${validator.unescape(settings.tax) != "" ? "Vat No: " + validator.unescape(settings.tax) + "<br>" : ""} 
    </p>
    <hr>
    <left>
        <p>
        Invoice : ${orderNumber} <br>
        Customer : ${
          allTransactions[index].customer == 0
            ? "Walk in Customer"
            : allTransactions[index].customer.name
        } <br>
        Cashier : ${allTransactions[index].user} <br>
        Date : ${moment(allTransactions[index].date).format(
          "DD MMM YYYY HH:mm:ss",
        )}<br>
        </p>

    </left>
    <hr>
    <table width="90%">
        <thead>
        <tr>
            <th>Item</th>
            <th>Qty</th>
            <th class="text-right">Price</th>
        </tr>
        </thead>
        <tbody>
        ${items}                
        <tr><td colspan="3"><hr></td></tr>
        <tr>                        
            <td><b>Subtotal</b></td>
            <td>:</td>
            <td class="text-right"><b>${moneyFormat(
              allTransactions[index].subtotal,
            )} ${validator.unescape(settings.symbol)}</b></td>
        </tr>
        <tr>
            <td>Discount</td>
            <td>:</td>
            <td class="text-right">${
              discount > 0
                ? moneyFormat(parseFloat(allTransactions[index].discount).toFixed(2),) +
				  validator.unescape(settings.symbol) 
                : ""
            }</td>
        </tr>
        
        ${tax_row}
    
        <tr>
            <td><h5>Total</h5></td>
            <td><h5>:</h5></td>
            <td class="text-right">
                <h5>${moneyFormat(
                  allTransactions[index].total,
                )} ${validator.unescape(settings.symbol)}</h5>
            </td>
        </tr>
        ${payment == 0 ? "" : payment}
        </tbody>
        </table>
        <br>
        <hr>
        <br>
        <p style="text-align: center;">
         ${validator.unescape(settings.footer)}
         </p>
        </div>`;

        //prevent DOM XSS; allow windows paths in img src
        receipt = DOMPurify.sanitize(receipt,{ ALLOW_UNKNOWN_PROTOCOLS: true });

  $("#viewTransaction").html("");
  $("#viewTransaction").html(receipt);

  $("#orderModal").modal("show");
};

$("#status").on("change", function () {
  by_status = $(this).find("option:selected").val();
  loadTransactions();
});

$("#tills").on("change", function () {
  by_till = $(this).find("option:selected").val();
  loadTransactions();
});

$("#users").on("change", function () {
  by_user = $(this).find("option:selected").val();
  loadTransactions();
});

$("#reportrange").on("apply.daterangepicker", function (ev, picker) {
	//console.log("You are selecting date");
  start = picker.startDate.format("DD MMM YYYY hh:mm A");
  end = picker.endDate.format("DD MMM YYYY hh:mm A");
   //console.log("start: ",start);
  start_date = picker.startDate.toDate().toJSON();
  end_date = picker.endDate.toDate().toJSON();

  loadTransactions();
});

function authenticate() {
  $(".loading").hide();
  $("body").attr("class", "login-page");
  $("#login").show();
}

$("body").on("submit", "#account", function (e) {
  e.preventDefault();
  let formData = $(this).serializeObject();

  if (formData.username == "" || formData.password == "") {
    notiflix.Report.warning("Incomplete form!", auth_empty, "Ok");
  } else {
    $.ajax({
      url: api + "users/login",
      type: "POST",
      data: JSON.stringify(formData),
      contentType: "application/json; charset=utf-8",
      cache: false,
      processData: false,
      success: function (data) {
        if (data.auth === true) {
          storage.set("auth", { auth: true });
          storage.set("user", data);
          ipcRenderer.send("app-reload", "");
          $("#login").hide();
        } else {
          notiflix.Report.warning("Oops!", auth_error, "Ok");
        }
      },
      error: function (data) {
        console.log(data);
      },
    });
  }
});

$("#quit").on("click", function () {
  const diagOptions = {
    title: "Are you sure?",
    text: "You are about to close the application.",
    icon: "warning",
    okButtonText: "Close Application",
    cancelButtonText: "Cancel"
  };

  notiflix.Confirm.show(
    diagOptions.title,
    diagOptions.text,
    diagOptions.okButtonText,
    diagOptions.cancelButtonText,
    () => {
      ipcRenderer.send("app-quit", "");
    },
  );
});
