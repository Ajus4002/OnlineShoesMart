var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers')
var db = require('../config/connection')
var ObjectID = require('mongodb').ObjectID;
const { Db, ObjectId } = require('mongodb');
const userHelper = require('../helpers/user-helper');
const { USER_COLLECTION } = require('../config/collections');
const session = require('express-session');
const addressHelpers = require('../helpers/address-helpers');
var couponHelpers=require('../helpers/coupon-helper')
/* GET home page. */
const verifyLogin=(req,res,next)=>{
  if(req.session.isLoggedIn){
    next()
  }else{
    res.redirect('/user-login')
  }
}




router.get('/',async function(req, res, next) {


    let user=req.session.user
    let cartCount=null
    if(req.session.user){
      let cartCount=await userHelper.getCartCount(req.session.user._id)
    }

    res.render('users/index',{footer:true,user:true,auth: req.session.user, cartCount})

});

router.get('/shop',function(req,res){
  productHelpers.getAllProducts().then((product) => {
    res.render('users/shop',{footer:true, user:true, product, auth: req.session.user})
  })
});



router.get('/user-login',function(req,res){
  if (req.session.isLoggedIn) {
    res.redirect('/')
    return;
  }

  if (req.query.referer) {
    req.session.referer = req.query.referer
  }

  res.render('users/user-login',{footer:false,user:false})
});

router.get('/user-logout',function(req,res){
  req.session.destroy()
  res.redirect('/user-login')
});
  
//referel signup
router.get('/user-login/:id', (req, res) => {

  // console.log(req.params,'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');

  req.session.referId = req.params.id;
  // console.log(req.session.referId,'11111111111111111111111');
  console.log(req.session.referId, 'referid signup get');

  res.render('users/user-login')
})



router.post('/user-login', async function(req,res){
  
  const user = await db.get().collection('users').findOne({phoneNo: req.body.phoneNo, isBlocked: false})
  if (user) {
    req.session.isLoggedIn = true
    req.session.user = user

    res.json({success: true})
    return;
  }

  res.json({success: false, message: "You Dont Have a Account"})
});

router.post('/user-register', async function(req,res){


  const user = await db.get().collection('users').findOne({phoneNo: req.body.phoneNo})
  if (user) {
    res.json({success: false, message: "User already exists"})
    return;
  }

  const referedBy = await db.get().collection('users').findOne({_id: ObjectId(req.session.referer)})
  const referAmount = 50

  const user1 = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phoneNo: req.body.phoneNo,
    email: req.body.email,
    isBlocked: false,
    referer: referedBy ? referedBy._id : null,
    walletAmount: referedBy ? referAmount : 0
  };

  if (referedBy) {
    await db.get().collection('users').updateOne({_id: referedBy._id}, {$inc: {walletAmount: referAmount}})
  }

  db.get().collection('users').insertOne(user1).then((data) => {
    user1._id = data.insertedId;

    req.session.isLoggedIn = true
    req.session.user = user1

//...............................//


res.json({success: true, user1})



  }).catch(e => res.json({success: false, message: "Error"}))
});



router.get('/orders', verifyLogin, async function(req, res, next) {
  const orders = await db.get().collection('order').find({user: ObjectID(req.session.user._id)}).toArray()
  orders.forEach(order => {
    order.time = new Date(order.time).toISOString()
    order.itemCount = order.items.length;

    order.items.forEach((item) => {
      item.total = item.quantity * item.product.price
    })
  })

  res.render('users/order-management',{user:true, footer: true, orders})
});

//preview page

router.get('/preview-page', async function(req, res, next) {


console.log(req.query.id);
  productHelpers.getProductDetails(req.query.id).then((product) => {
    console.log(product);

 
    res.render('users/preview-page',{footer:true,user:true,product})
  })
  });

//add to cart

router.get('/checkout', verifyLogin,async(req,res)=>{
console.log(req.session);
  let products = await userHelper.getCartProducts(req.session.user._id)
  console.log(products);

  let total = products.reduce((acc, v) => acc + parseFloat(v.product.price) * parseInt(v.quantity), 0);
  products.forEach(v => v.total = v.product.price * v.quantity)

  res.render('users/checkout',{footer:true,user:req.session.user,products, total})
})


router.get ('/add-to-cart/:id',(req,res)=>{

  userHelper.AddtoCart(req.params.id, req.session.user._id);
  res.send();
})

//route for delete product
router.get('/delete-cart/:itemId', (req, res) => {
  userHelper.deleteCart(req.params.itemId, req.session.user._id).then((response) => {
    res.redirect('/checkout')
  })
})


/* post change product quantity*/
router.post('/change-product-quantity',(req,res,next)=>{
  console.log(req.body,'dasdasdasdddadasd');
  userHelper.changeProductQuantity(req.body).then(async(response)=>{
     response.total=await userHelper.getTotalAmount(req.body.user)
    res.json(response)

  })
})

//address page
router.get('/checkout-adress', verifyLogin,async(req,res)=>{
  let products = await userHelper.getCartProducts(req.session.user._id)
  let coupon=null;
  if(req.session?.coupon){
    coupon=await couponHelpers.getCoupon(req.session.coupon)
  }

  addressHelpers.getAllAddress().then(async (address) => {

  let total = products.reduce((acc, v) => acc + parseFloat(v.product.price) * parseInt(v.quantity), 0);
  let grandTotal=total
  let couponDiscount=0
  if(coupon){
    couponDiscount=total*coupon.discount/100
    grandTotal=total-couponDiscount
    
  }
  products.forEach(v => v.total = v.product.price * v.quantity)

  const user = await db.get().collection('users').findOne({_id: ObjectId(req.session.user._id)})

  res.render('users/checkout-adress',{footer:true,user,address,products,total,couponDiscount,grandTotal,coupon})
})

})

//apply coupon
router.post('/apply-coupon',verifyLogin,async(req,res)=>{
  let coupon=await couponHelpers.getCoupon(req.body.coupon)
  const isApplied = await couponHelpers.isCouponApplied(req.body.coupon, req.session.user._id)

if(coupon && !isApplied){
  req.session.coupon=req.body.coupon
}
else{
  req.session.coupon=null
}

res.redirect('/checkout-adress')

})


//dfggggggggggggggggggggggggg
/*get place order */
router.get('/place-order', verifyLogin, async (req, res) => {
  let user = req.session.userLoggedIn
  let total = await userHelper.getTotalAmount(req.session.userLoggedIn._id)
  let address = await addressHelpers.getAlladdress(user)
  console.log(address);
  res.render('user/place-order', { userheader: true, user, total, address })
})
//buy now but on

router.post('/place-order', verifyLogin, async (req, res) => {
  try {
    const data = await userHelper.placeOrder(req.session.user._id, req.body.address, req.body.paymentType,req.session.coupon, req.body.walletAmount)
    req.session.coupon=null
    res.json({success: true, ...data, user: req.session.user});
  } catch (e) {
    res.json({success: false, error: e.message});
  }
})

router.post('/order/paynow', verifyLogin, async (req, res) => {
  try {
    const data = await userHelper.payNow(req.body)
    res.json({success: true,});
  } catch (e) {
    res.json({success: false, error: e.message});
  }
})



//profile page
router.get('/profile-page', verifyLogin,async(req,res)=>{
  let products = await userHelper.getCartProducts(req.session.user._id)
  console.log(products);
  let total = products.reduce((acc, v) => acc + parseFloat(v.product.price) * parseInt(v.quantity), 0);
  products.forEach(v => v.total = v.product.price * v.quantity)
//referal and erning 




  res.render('users/profile-page',{footer:true,user:req.session.user,products, total})
})



/* get add address*/
router.get('/add-address', verifyLogin, async (req, res) => {
  let user=req.session.user

  res.render('users/add-address', { user: true, user})
})



router.post('/add-address',(req,res,next)=>{
  addressHelpers.addAddress(req.body).then(async(response)=>{
    res.redirect('/checkout-adress')
  })
})

//adress show page
router.get('/address-show-page',(req,res)=>{
  addressHelpers.getAllAddress().then((address) => {
    res.render('users/address-show-page',{footer:true,user:true,address})
  })
})

//edit adresss details

router.get('/edit-address/:id', verifyLogin, async (req, res) => {

console.log(req.params.id);
  await addressHelpers.getOneAddress(req.params.id).then((address) => {
    res.render('users/edit-address', { user: true, address })
  })
})

/*post edit address */
router.post('/edit-address', verifyLogin, (req, res) => {
  let id=req.query.id
  console.log(id);
  console.log(req.body);
  addressHelpers.updateAddresss(req.body,req.query.id).then(() => {
    res.redirect('/address-show-page')
  })
})

//delete adddresss
router.get('/deleteuser-address/:id',(req,res)=>{
  let orderId=req.params.id
  addressHelpers. deleteAddress(orderId).then((response)=>{
      res.redirect('/address-show-page')
  })
})

//success
router.get('/success',(req,res)=>{
  res.render('users/success')
})



//add profile photo

// router.post('/add-profile',(req,res,next)=>{
//   userHelper.addprofile(req.body).then(async(response)=>{
//     let image=req.files.Image
//     image.mv('./public/product-image/' + id + '.jpg',(err,done)=>{
//       if (err) {
//         reject(err);
//       } else {
//         resolve()
//       }
//     })
//     res.redirect('/checkout-adress')
//   })
// })

//payment page
// router.get('/payment',(req,res)=>{
//   res.render('users/payment',{footer:true,user:true})
// })


module.exports = router;
