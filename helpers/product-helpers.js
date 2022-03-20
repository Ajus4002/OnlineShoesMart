
var db=require('../config/connection')
var collection=require('../config/collections')
const { ObjectId } = require('mongodb');

module.exports={
    addproduct:(product,callback)=>{
        console.log(product);
        if (product.category) {
            product.category = ObjectId(product.category)
        }
        product.price = parseFloat(product.price)
        if (product.discount) {
            product.discount = parseFloat(product.discount)
        }

        db.get().collection('product').insertOne(product).then((data) => {

            callback(data.insertedId)
        })
    },
    getAllProducts:(applyDiscount = true, query = {})=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $lookup: {
                        from: collection.CATEGORY_COLLECTION,
                        localField: 'category',
                        foreignField: '_id',
                        as: "category"
                    }
                },
                {"$unwind": "$category"},
                { $match: query }
            ]).toArray()

            if (applyDiscount) {
                products.forEach(product => {
                    if (product.discount > 0) {
                        product.oldPrice = product.price;
                        product.price = product.price - ((Number(product.discount) / 100) * Number(product.price))
                    } else if (product.category.discount > 0) {
                        product.oldPrice = product.price;
                        product.price = product.price - ((Number(product.category.discount) / 100) * Number(product.price))
                        product.discount = product.category.discount
                    }
                })
            }

            console.log(products)
            resolve(products)
        })
        

    },
    deleteProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: ObjectId(prodId) }).then((response) => {

                resolve(response)
            })
        })
    },
    getProductDetails: (proId, applyDiscount = true) => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match: {
                        _id: {$eq: ObjectId(proId) }
                    }
                },
                {
                    $lookup: {
                        from: collection.CATEGORY_COLLECTION,
                        localField: 'category',
                        foreignField: '_id',
                        as: "category"
                    }
                },
                {"$unwind": "$category"}
            ]).toArray()

            product = product[0]

            if (applyDiscount) {
                if (product.discount) {
                    product.oldPrice = product.price;
                    product.price = product.price - ((Number(product.discount) / 100) * Number(product.price))
                } else if (product.category.discount > 0) {
                    product.oldPrice = product.price;
                    product.price = product.price - ((Number(product.category.discount) / 100) * Number(product.price))
                    product.discount = product.category.discount
                }
            }


            resolve(product)
        })
    },
    updateProduct:(proId,proDetails)=>{

        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId(proId)},{
                $set:{
                    name:proDetails.name,
                    category: ObjectId(proDetails.category),
                    price: parseFloat(proDetails.price),
                    discount: parseFloat(proDetails.discount)
                }
            }).then((response)=>{
                resolve()
            })
        })
    }

}
