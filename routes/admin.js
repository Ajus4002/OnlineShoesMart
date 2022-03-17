var express = require('express');
const { Db, ObjectId} = require('mongodb');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers')
var userHelper=require('../helpers/user-helper')
var categoryHelpers=require('../helpers/category-helpers')
var couponHelpers=require('../helpers/coupon-helper')

// var Helpers=require('../routes/users')
var db = require('../config/connection')
var session=require('express-session')
var ObjectID = require('mongodb').ObjectID;

/* GET users listing. */

router.get('/', async function(req, res, next) {


  if (!req.session.admin) {
    res.redirect('/admin/admin-login')
    return
  }

  const orderCount = await db.get().collection('order').find().count()
  const userCount = await db.get().collection('users').find().count()
  const SalesDelivered=await db.get().collection('order').find({status:"Delivered"}).count()
  const SalesPending=await db.get().collection('order').find({status:"Pending"}).count()
  let SalesProcessing=await db.get().collection('order').find({status:"Processing"}).count()
  let SalesCancelled=await db.get().collection('order').find({status:"Cancelled"}).count()
  let SalesDispatched=await db.get().collection('order').find({status:"Dispatched"}).count()
  console.log("jhbodivwpoeniodu9ebusoifbdiontul");
  const orders = await db.get().collection('order').find({}).toArray()
  const items = {}

  orders.forEach(order => {
    order.items.forEach((item) => {
      const _id = item.product.id;

      if (!items[_id]) {
        items[_id] = {
          itemName: item.product.name,
          count: 0,
          totalAmount: 0
        }
      }

      items[_id].count += item.quantity;
      items[_id].totalAmount = item.quantity * item.product.price
    })
  })

  const chart = {
    x: Object.values(items).map(v => v.itemName),
    y1: Object.values(items).map(v => v.count),
    y2: Object.values(items).map(v => v.totalAmount),
  }




    res.render('admin/view-products',{admin:true, orderCount,userCount,SalesDelivered,SalesPending,SalesCancelled,SalesDispatched,SalesProcessing,chart});
});
router.get('/add-product', async function (req, res) {
  var category = await categoryHelpers.getAllCategory()

  productHelpers.getAllProducts().then((product) => {

    res.render('admin/add-product',{admin:true,product, category});
  })


})
router.post('/add-product', async (req, res) => {
  var category = await categoryHelpers.getAllCategory()

  async function saveFile(image, name) {
    return new Promise((resolve, reject) => {
      image.mv('./public/product-image/' + name, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve()
        }
      })
    })
  }

  let images = req.files?.images ?? []
  let otherImages = []

  for (let i = 0; i < images?.length; i ++) {
    let name = Date.now + '_' + Math.random() + '.jpg';
    await saveFile(images[i], name)
    otherImages.push(name)
  }

  req.body.otherImages = otherImages;


  productHelpers.addproduct(req.body, (id) => {

    let image = req.files?.image
    if (!image) {
      res.render("admin/add-product",{admin:true, itemAdded: true, category})
      return;
    }

    image?.mv('./public/product-image/' + id + '.jpg', (err) => {
      if (!err) {
        res.render("admin/add-product",{admin:true, itemAdded: true, category})
      } else {
        console.log(err);
      }

    })

  })
})


router.get('/product-table',function(req,res){


  productHelpers.getAllProducts(false).then((product) => {

    res.render('admin/product-table',{admin:true,product});
  })

})

//route for delete product
router.get('/delete-product/:id', (req, res) => {
  let proId = req.params.id

  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/product-table')
  })
})

router.get('/user/:id/block', async (req, res) => {
  db.get().collection('users').updateOne({_id: new ObjectID(req.params.id)}, {$set: {isBlocked: true}})
  res.redirect('/admin/user-management')
})

router.get('/user/:id/unblock', async (req, res) => {
  db.get().collection('users').updateOne({_id: new ObjectID(req.params.id)}, {$set: {isBlocked: false}})
  res.redirect('/admin/user-management')
})


router.get('/user-management',(req,res)=>{
  userHelper.getAllusers().then((users) => {

    console.log(users);
    let user=users.user
    let count=users.count
    console.log(count);

    res.render('admin/user-management',{admin:true,user,count});
  })
  


})


router.get('/delete-user/:id', (req, res) => {
  let userId = req.params.id

  userHelper.deleteuser(userId).then((response) => {
    res.redirect('/admin/user-management')
  })
})

//admin login

router.get('/admin-login', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin')
  } else {
    res.render('admin/admin-login', { "loginErr": req.session.adminLoginErr })
    req.session.adminLoginErr = false
  }
})

router.post('/admin-login', (req, res) => {

  if (req.body.email === 'ajus4002@gmail.com' && req.body.password === '123456') {
      req.session.admin = {email: req.body.email}
      req.session.admin.loggedIn = true
      res.redirect('/admin')
  } else {
    req.session.adminLoginErr ="Invalid Username or Password"
    res.redirect('/admin/admin-login')
  }
})

router.get('/admin-logout', (req, res) => {
  req.session.admin=null
  res.redirect('/admin/admin-login')
})

router.post('/order/:id/change-status', async (req, res) => {
  try {
    await db.get().collection('order').updateOne({_id: ObjectID(req.params.id)}, {$set: {status: req.body.status}})
    res.json({success: true})
  } catch (e) {
    console.log(e.message)
    res.json({success: false})
  }
})


//edit product
router.get('/edit-product/:id', async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id, false)
  var category = await categoryHelpers.getAllCategory()
  category.forEach(v => v.selected = product.category._id.toString() == v._id.toString() ? true : undefined);

  console.log(category)
  res.render('admin/edit-product', {admin:true, product ,category})
})
router.post('/edit-product/:id', (req, res) => {

  let id=req.params.id
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin')
    if (req.files?.image) {
    let image=req.files?.image
      image.mv('./public/product-image/' + id + '.jpg')
    }
  })
})

 router.get('/category-table', function (req, res) {
 categoryHelpers.getAllCategory().then((category) => {

    res.render('admin/category-table',{admin:true,category});
  })

})




router.get('/add-category',(req,res)=>{
  res.render('admin/add-category',{admin:true})
})

// /post add category/
router.post('/add-category',(req,res)=>{
  categoryHelpers.addCategory(req.body).then((response)=>{
      res.redirect('/admin/category-table')
  })
})

// /* get edit category */
 router.get('/edit-category/:id',async(req,res)=>{
  categoryHelpers.getCategory(req.params.id).then((oneCategorey)=>{

    res.render('admin/edit-category',{admin:true,oneCategorey})
  })

 })

/* post edit category*/

 router.post('/edit-category',(req,res)=>{
   console.log(req.query.id);
  categoryHelpers.updateCategory(req.query.id,req.body).then(()=>{
       res.redirect('/admin/category-table')
  })
 })

/*delete category*/

router.get('/delete-category/:id',(req,res)=>{
  let catId=req.params.id
  categoryHelpers.deleteCategory(catId).then((response)=>{
      res.redirect('/admin/category-table')
  })
})
//address table
router.get('/checkout-addresstable',(req,res)=>{
  userHelper.getAllAdress().then((adress) => {
      console.log(adress);
    res.render('admin/checkout-addresstable',{admin:true,adress})
  })



})


router.get('/delete-address/:id',(req,res)=>{
  let orderId=req.params.id
  userHelper. deleteAdress(orderId).then((response)=>{
      res.redirect('/admin/checkout-addresstable')
  })
})

//order management
router.get('/order-management', async (req,res)=>{
  const orders = await db.get().collection('order').find({}).toArray()
  orders.forEach(order => {
    order.time = new Date(order.time).toISOString()
    order.itemCount = order.items.length;
    order.items.forEach((item) => {
      item.total = item.quantity * item.product.price
    })

    if(order.status === "Cancelled"){
      order.isCancel = true;
    }
  })



  res.render('admin/order-management',{admin:true, orders})
})



router.get('/coupon',  function (req, res) {
 

  couponHelpers. getAllCoupon().then((coupon) => {

    res.render('admin/coupon',{admin:true,coupon});
  })

})
// /post add coupon/
router.post('/coupon',(req,res)=>{
  couponHelpers.addCoupon(req.body).then((response)=>{
      res.redirect('/admin/coupon')
  })
})

//delete coupon

router.get('/delete-coupon/:id',(req,res)=>{
  let couponId=req.params.id
  couponHelpers. deleteCoupon(couponId).then((response)=>{
      res.redirect('/admin/coupon')
  })
})

//sales table

router.get('/sales-reporttable',async function(req,res){


  const dateParts = new Date().toISOString().split('T')[0].split('-')
  const filters = [
    {name: "Today", url: `/admin/sales-reporttable?date=${dateParts[2]}&month=${dateParts[1]}&year=${dateParts[0]}`},
    {name: "Month", url: `/admin/sales-reporttable?month=${dateParts[1]}&year=${dateParts[0]}`},
    {name: "Year", url: `/admin/sales-reporttable?year=${dateParts[0]}`}
  ]

  const match = {
    
  };

  if (req.query['date']) {
    match['day'] = {$eq: parseInt(req.query['date'])}
  }

  if (req.query['month']) {
    match['month'] = {$eq: parseInt(req.query['month'])}
  }

  if (req.query['year']) {
    match['year'] = {$eq: parseInt(req.query['year'])}
  }

  const from = req.query['from']
  const to = req.query['to']

  console.log(match);

  let SalesOrders = await db.get().collection('order').aggregate([
    {
      $addFields: {
        time: {"$add": [ new Date(0), "$time" ]},
      }
    }, 
    {
      $addFields: {
        day: {$dayOfMonth: "$time"},
        month: {$month: '$time'},
        year: {$year: '$time'}
      }
    },
    {$match: match}
  ]).toArray()
  console.log(SalesOrders)
  SalesOrders.forEach(o => o.time = new Date(o.time).toISOString())
  SalesOrders = SalesOrders.filter(v => {
    if (from && v.time < new Date(from)) {
      return false
    }
    if (to && v.time > new Date(to)) {
      return false
    }

    return true
  })
  
  res.render('admin/sales-reporttable',{admin:true, SalesOrders, filters, filterFrom: from, filterTo: to})
});


module.exports = router;
