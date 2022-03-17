
var db=require('../config/connection')
var collection=require('../config/collections')
const { ObjectId } = require('mongodb');

module.exports={
    addCategory: (category) => {
        return new Promise((resolve, reject) => {
            if (category.discount) {
                category.discount = parseFloat(category.discount)
            }
            db.get().collection(collection.CATEGORY_COLLECTION).insertOne(category).then((data) => {
                console.log(data);
                resolve(data.insertedId)
            })

        })
    },
    getAllCategory: () => {
        return new Promise(async (resolve, reject) => {
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()

            // console.log(categorey, 'dasdadaddasca');
            resolve(category)

        })
    },
    getCategory: (categoreyId) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: ObjectId(categoreyId) }).then((oneCategorey) => {
                resolve(oneCategorey)
            })
        })
    },
    updateCategory: (categoreyId, categorey) => {

        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ _id: ObjectId(categoreyId) }, {
                $set: { catname: categorey.catname, discount: parseFloat(categorey.discount) ?? 0 }
            }).then((response)=>{
                resolve()
            })
        })
    },
    deleteCategory:(catId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({_id:ObjectId(catId)}).then((response)=>{
                resolve(response)
            })
        })
    },
    //sales report
    getAllOrderDetails:()=>{
        console.log("hdjkshfalijslvjgo;j");
        return new Promise(async(resolve,reject)=>{
            let SalesOrders=await db.get().collection(collection.ORDER_COLLECTION).find({status:"Delivered"}).toArray()
            console.log(SalesOrders,'1111111111111111111');
            resolve(SalesOrders)
        })

    }

}

    
//     getAllSailsReport:()=>{
//         return new Promise(async(resolve,reject)=>{
//             let products=await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
//                 {
//                     $lookup: {
//                         from: collection.CATEGORY_COLLECTION,
//                         localField: 'category',
//                         foreignField: '_id',
//                         as: "category"
//                     }
//                 },
//                 {"$unwind": "$category"}
//             ]).toArray()
//             products.forEach(product => {
//                 if (product.discount) {
//                     product.oldPrice = product.price;
//                     product.price = product.price - ((Number(product.discount) / 100) * Number(product.price))
//                 }
//             })

//             resolve(products)
//         })

//     }

// }