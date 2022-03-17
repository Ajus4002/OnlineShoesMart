
var db=require('../config/connection')
var collection=require('../config/collections')
const { ObjectId } = require('mongodb');
const { resolve } = require('../public/javascripts/minicart');
const { response } = require('express');
const { use } = require('../routes/users');
const Razorpay = require("razorpay");
const couponHelpers=require('./coupon-helper')
module.exports={
    adduser:(user,callback)=>{
        console.log(user);
        db.get().collection('user').insertOne(user).then((data) => {

            callback(data.insertedId)
        })
    },
    getAllusers:()=>{
        return new Promise(async(resolve,reject)=>{
            let user=await db.get().collection(collection. USER_COLLECTION).find().toArray()
            let count=await db.get().collection(collection. USER_COLLECTION).find().count()
            resolve({'user':user,'count':count})
        })
        

    },


    deleteuser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).deleteOne({ _id: ObjectId(userId) }).then((response) => {

                resolve(response)
            })
        })
    },
    AddtoCart:(proId,userId)=>{
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})

            if(userCart){
                var prod = userCart.products.findIndex(v => v.item == proId);
                if (prod >= 0) {
                    userCart.products[prod].quantity ++;

                    db.get().collection(collection.CART_COLLECTION).updateOne({user:ObjectId(userId)}, {
                        $set: {
                            products: userCart.products
                        }
                    }).then((response)=>{
                        resolve()
                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:ObjectId(userId)},
                        {

                            $push:{
                                products:{item: ObjectId(proId), quantity: 1}
                            }
                        })
                        .then((response)=>{
                            resolve()
                        })
                }


            }else{
                let cartobj={
                    user:ObjectId(userId),
                    products: [{item: ObjectId(proId), quantity: 1}]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartobj).then((response)=>{
                    resolve()
                })

            }
        })

    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: "product",
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $lookup: {
                        from: collection.CATEGORY_COLLECTION,
                        localField: 'product.category',
                        foreignField: '_id',
                        as: "product.category"
                    }
                },
                {"$unwind": "$product.category"}
            ]).toArray()

            cartItems.forEach(v    => {
                if (v.product.discount) {
                    v.product.oldPrice = v.product.price;
                    v.product.price = v.product.price - ((Number(v.product.discount) / 100) * Number(v.product.price))
                } else if (v.product.category?.discount > 0) {
                    v.product.oldPrice = v.product.price;
                    v.product.price = v.product.price - ((Number(v.product.category.discount) / 100) * Number(v.product.price))
                    v.product.discount = v.product.category.discount
                }
            })

            resolve(cartItems)
        })
    },

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)

        })
    },

    changeProductQuantity: (details) => {
        console.log(details, 'hbhj');
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        console.log(details);
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                // console.log("if case worked");
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: ObjectId(details.cart) }, {
                    $pull: { products: { item: ObjectId(details.product) } }
                }).then((response) => {
                    resolve({ removeProduct: true })
                })
            } else {

                // console.log("else case worked");
                db.get().collection(collection.CART_COLLECTION).updateOne({
                    _id: ObjectId(details.cart),
                    'products.item': ObjectId(details.product)
                }, {
                    $inc: { 'products.$.quantity': details.count }
                }).then((response) => {
                    resolve({ status: true })
                })
            }
        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: "product"
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                    }
                }
            ]).toArray()
            console.log(total, 'dasdadadfadf');
            resolve(total[0].total)
        })
    },

    deleteCart(itemId, userId) {

        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ user: ObjectId(userId) }, {
                $pull: { products: { item: ObjectId(itemId) } }
            }).then((response) => {
                resolve({ removeProduct: true })
            })

        })
    },

    async placeOrder(userId, addressId, paymentType, couponName, walletAmount) {
        const items = await this.getCartProducts(userId);
        const address = await db.get().collection(collection.ADDRESS_COLLECTION).findOne(ObjectId(addressId))
let total = items.reduce((acc, v) => acc + parseFloat(v.product.price) * parseInt(v.quantity), 0);

        delete address._id
        let couponDiscount=0
        if(couponName){
        const coupon=await couponHelpers.getCoupon(couponName)
        const isApplied = await couponHelpers.isCouponApplied(couponName, userId)

        if(coupon && !isApplied){
            couponDiscount=total*coupon.discount/100
        }
    }
        
        items.forEach(v => {
            v.product.id = ObjectId(v.product._id);
            v.total = v.product.price * v.quantity

            delete v.product._id;
            delete v._id
        });
let grandTotal=total-couponDiscount
//wallet
if (walletAmount) {
    const user = await db.get().collection(collection.USER_COLLECTION).findOne({_id: ObjectId(userId)})
    if (user.walletAmount < walletAmount) {
        throw new Error("Insufficient Balance")
    }
}

        const order = {
            user: ObjectId(userId),
            items,
            address,
            total,
            couponCode: couponDiscount ? couponName : null,
            couponDiscount,
            grandTotal,
            time: Date.now(),
            status: 'Pending',
            paymentType,
            payment: 'Pending'
        }

        const result = await db.get().collection(collection.ORDER_COLLECTION).insertOne(order)

        if (walletAmount) {
            await db.get().collection(collection.USER_COLLECTION).updateOne({_id: ObjectId(userId)}, {$inc: {walletAmount: -grandTotal}})
            return {
                order
            }
        }

        if (paymentType === 'cod') {
            return {
                order
            }
        }
//wallet payment details


        const instance = new Razorpay({
            key_id: 'rzp_test_vgT5Uko4iBzDgk',
            key_secret: 'kp3T81D10SYTEFKgstV3uhx3',
        });

        const options = {
            amount: grandTotal * 100,
            currency: 'INR',
            receipt: "" + order._id
        };

        function createOrder() {
            return new Promise((resolve, reject) => {
                instance.orders.create(options, function(err, order) {
                    if (err) reject(err);
                    else resolve(order)
                });
            })
        }

        const paymentOrder = await createOrder()

        await db.get().collection(collection.ORDER_COLLECTION).updateOne({_id: ObjectId(order._id)}, {$set: {
            razorpayOrder: paymentOrder.id
        }})
        return {
            order,
            payment: paymentOrder
        };
    },

    async payNow(order) {
        console.log(order.razorpay_order_id)
        await db.get().collection(collection.ORDER_COLLECTION).updateOne({
            razorpayOrder: order.razorpay_order_id
        }, {
            $set: {
                paymentResult: order,
                payment: "Success"
            }
        })
    },

//get all adress valu tothe table
    getAllAdress:()=>{
        return new Promise(async(resolve,reject)=>{
            let adress=await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            resolve(adress)
        })

    },
    deleteAdress:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).deleteOne({_id:ObjectId(orderId)}).then((response)=>{
                resolve(response)
            })
        })
    },
    //profile add

    addprofile:(profile,callback)=>{
        
        db.get().collection('profile').insertOne(profile).then((data) => {

            callback(data.insertedId)
        })
    },
    checkReferal:(referal)=>{
        return new Promise(async(resolve,reject)=>{
          let refer=await db.get().collection(collection.USER_COLLECTION).find({refer:referal}).toArray()
          console.log(refer);
          if(refer){
            resolve(refer)
          }else{
            reject()
          }
    
        })
      },
      doSignUp: (userData) => {
        let response={}
        return new Promise(async (resolve, reject) => {
          if(userData.wallet){
            await db.get().collection(collection.USER_COLLECTION).updateOne({_id:userData.referedBy},{$inc:{wallet:50}})
            
          }
          userData.status = true;
          userData.wallet=userData.wallet?userData.wallet:0
          userData.password = await bcrypt.hash(userData.password, 10);
          db.get().collection(collection.USER_COLLECTION).insertOne(userData).then(async(data) => {
              let user=await db.get().collection(collection.USER_COLLECTION).findOne({_id:ObjectId(data.insertedId)})
              response.user=user
              response.status=true
              resolve(response);
            })
            .catch((err) => {
              err = "This user Already Exists";
              reject(err);
            });
        });
      }
      
}

