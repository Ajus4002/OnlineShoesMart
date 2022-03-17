
var db=require('../config/connection')
var collection=require('../config/collections')
const { ObjectId } = require('mongodb');

module.exports={
    addAddress:(address)=>{
        address.userId=ObjectId(address.userId)
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ADDRESS_COLLECTION).insertOne(address).then((data)=>{
                resolve(data)
            })
        })
    },
    getAllAddress:()=>{
        return new Promise(async(resolve,reject)=>{
        let adress=await db.get().collection(collection.ADDRESS_COLLECTION).find().toArray()
        resolve(adress)
        })
        
        },
    getOneAddress:(addressId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ADDRESS_COLLECTION).findOne(
                { _id:ObjectId(addressId) }).then((addressDetails)=>{
                    resolve(addressDetails)
                })
        })
    },
    updateAddresss:(upAddress,id)=>{

        id=ObjectId(id)
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ADDRESS_COLLECTION).updateOne(
                {_id:id},{
                    $set:{
                       name:upAddress.name,
                        mobile:upAddress.mobile,
                        landmark:upAddress.landmark,
                        town:upAddress.town,
                        zipcode:upAddress.addressType
                    }
                }
            ).then((response)=>{
                console.log(response);
                resolve()
            })
        })
    },
    deleteAddress:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ADDRESS_COLLECTION).deleteOne({_id:ObjectId(orderId)}).then((response)=>{
                resolve(response)
            })
        })
    }
}