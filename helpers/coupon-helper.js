
var db=require('../config/connection')
var collection=require('../config/collections')
const { ObjectId } = require('mongodb');

module.exports={
    addCoupon:(coupon)=>{
    coupon.discount=parseFloat(coupon.discount)
    coupon.expdate=new Date(coupon.expdate)
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.COUPON_COLLECTION).insertOne(coupon).then((data)=>{
                resolve(data)
            })
        })
    },
    getAllCoupon: () => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            resolve(coupon)

        })
    },
    getCoupon:async(couponName)=>{

        let coupon=await db.get().collection(collection.COUPON_COLLECTION).findOne({couponname:couponName,expdate:{$gt:new Date()}})
        return coupon
    },

    isCouponApplied: async (couponName, userId) => {
        let coupon = await db.get().collection(collection.ORDER_COLLECTION).findOne({couponCode:couponName, user: ObjectId(userId)})
        return coupon != null
    },

    deleteCoupon:(couponId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.COUPON_COLLECTION).deleteOne({_id:ObjectId(couponId)}).then((response)=>{
                resolve(response)
            })
        })
    }


}