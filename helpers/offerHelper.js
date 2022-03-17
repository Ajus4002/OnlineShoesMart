
var db=require('../config/connection')
var collection=require('../config/collections')
const { ObjectId } = require('mongodb');



module.exports = {

    addCategoryOffer: (offer) => {
        offer.discount=parseInt(offer.discount)

        let offerItem = offer.offerItem;

        return new Promise(async (resolve, reject) => {
            let offerExist = await db.get().collection(collection.OFFERS_COLLECTION).findOne({ offerItem: offerItem })
            console.log(offerExist, 'offferrrrrrrrr exitsttttttttttttt');

            if (offerExist) {
                resolve({ Exist: true })

            } else {
                db.get().collection(collection.OFFERS_COLLECTION).insertOne(offer).then(async (data) => {
                    let activeOffer = await db.get().collection(collection.OFFERS_COLLECTION).findOne({ _id: data.insertedId })

                    console.log(activeOffer, 'activvvvvvvvvvvvvvvvvvvvvvveeeeeeeeeeeeee ffffoeeroferrr');

                    //let Id = activeOffer._id;
                    let discount = activeOffer.discount;

                    discount=parseInt(discount)

                    let category = activeOffer.offerItem;

                    //  let validity = activeOffer.validity;

                    let items = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                        {
                            $match: { $and: [{ category: category }, { offer: false }] },
                        },
                    ]).toArray();

                    console.log(items, 'item 1111111111111111111111111111sssssssssssss');

                    await items.map(async (product) => {
                        let productPrice = product.price;

                        let offerPrice = productPrice - (productPrice * discount) / 100;
                        offerPrice = parseInt(offerPrice.toFixed(2));
                        let proId = product._id + "";

                        await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: ObjectId(proId)},
                            {
                                $set: {
                                    price: offerPrice,
                                    offer: true,
                                    OldPrice: productPrice,
                                    offerPercentage: parseInt(discount),
                                },
                            }
                        );
                    });

                    let Item2 = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                        {
                            $match: {
                                $and: [{ category: category }, { ProductOffer: true }],
                            },
                        },
                    ]).toArray();

                    console.log(Item2, 'itemmmmm 222222222222222222');
                    
                    console.log(Item2[0],'item 2 1st');

                    if (Item2[0]) {

                        await Item2.map(async (product) => {

                            console.log(product,'map products????????????????????');

                            let ProdName = product.name;

                            proOFF = await db.get().collection(collection.PRODUCTOFFERS_COLLECTION).aggregate([
                                {
                                    $match: { items: { $regex: ProdName, $options: "i" } },
                                },
                            ]).toArray();

                            console.log(proOFF, 'offfffffffffff');

                            let proOffPercentage = parseInt(proOFF[0].discount);

                            discount = parseInt(discount);

                            let BSToFF = proOffPercentage < discount ? discount : proOffPercentage;
                            let prize = product.OldPrice;
                            let offerrate = prize - (prize * BSToFF) / 100;

                            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: ObjectId(product._id)},
                                {
                                    $set: {
                                        price: offerrate,
                                        offer: true,
                                        OldPrice: prize,
                                        offerPercentage: parseInt(BSToFF),
                                    },
                                }
                            );
                        });
                    } else {
                    }

                    resolve({ Exist: false });
                });
            }
        });
    },




    getCategoryOffer: () => {
        return new Promise(async (resolve, reject) => {
            let offerList = await db.get().collection(collection.OFFERS_COLLECTION).find().toArray();
            resolve(offerList);
        });
    },






    // categoryfind: () => {
    //     return new Promise((resolve, reject) => {
    //         db.get().collection(collection.CATEGORY_COLLECTION).find().toArray().then((result) => {
    //             res(result);
    //         });
    //     });
    // },




    deleteCategoryOffer: (offId, category) => {

        return new Promise(async (resolve, reject) => {
            let items = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match: { $and: [{ category: category }, { ProductOffer: false }] },
                },
            ]).toArray();

            console.log(items,'delete items offers where product offer not exist');

            await items.map(async (product) => {
                let productPrice = product.OldPrice;

                let proId = product._id + "";

                await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: ObjectId(proId)},
                    {
                        $set: {
                            price: productPrice,
                            offer: false,
                            offerPercentage:null
                        },
                    }
                );
            });

            let itemforUpdate = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match: { $and: [{ category: category }, { ProductOffer: true }] },
                },
            ]).toArray();

            console.log(itemforUpdate,'delete category offer product offer exist');

            if (itemforUpdate[0]) {
                await itemforUpdate.map(async (product) => {
                    let proName = product.Name;
                    let Off = await db.get().collection(collection.PRODUCTOFFERS_COLLECTION).aggregate([
                        {
                            $match: { items: { $regex: proName, $options: "i" } },
                        },
                    ]).toArray();

                    let dis = parseInt(Off[0].discount);

                    console.log(dis,'discountttttttttttttt');

                    let prze = product.OldPrice;
                    let offerPrice = prze - (prze * dis) / 100;

                    db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: ObjectId(product._id)},
                        {
                            $set: {
                                price: offerPrice,
                                offer: true,
                                OldPrice: prze,
                                offerPercentage: dis,
                                ProductOffer: true,
                            },
                        }
                    );
                });
            }

            db.get().collection(collection.OFFERS_COLLECTION).deleteOne({ _id: ObjectId(offId) }).then(async () => {
                resolve();
            });
        });
    },



/////////////// /product offers/////////////////

    addProductOffer: (offer) => {
        console.log(offer, 'addeddddddddddddddddddd offffffffffffffffffferrrrrrrrrrrr');
        offer.discount=parseInt(offer.discount)

        return new Promise(async (resolve, reject) => {
            let Pro = offer.items;

            let offerExist = await db.get().collection(collection.PRODUCTOFFERS_COLLECTION).aggregate([
                {
                    $match: { items: { $regex: Pro, $options: "i" } },
                },
            ]).toArray();
            console.log(offerExist, 'offerExisttttttttttttttttttttttttt');


            if (offerExist[0]) {

                resolve({ Exist: true })

            } else {
                await db.get().collection(collection.PRODUCTOFFERS_COLLECTION).insertOne(offer).then(async (data) => {
                    let ins = await db.get().collection(collection.PRODUCTOFFERS_COLLECTION).findOne({ _id: ObjectId(data.insertedId) });

                    console.log(ins, 'inserteddddddddddddd prodcuct offeresssssssss');

                    d = ins.discount;
                    console.log(d, 'disssssssssssscounttttttttttttt');

                });

                let ProName = offer.items;

                productoffer = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                    {
                        $match: { name: { $regex: ProName, $options: "i" } },
                    },
                ]).toArray()

                console.log(productoffer, 'prodcutttttttttttttttts offersssssssssssssssssssssss');

                let comingPercentage = parseInt(d);

                console.log(comingPercentage, 'new percentage discount');

                let activepercentege = productoffer[0].offerPercentage;

                let bestOff =
                    comingPercentage < activepercentege
                        ? activepercentege
                        : comingPercentage;

                if (productoffer[0].offer) {
                    let price = productoffer[0].OldPrice;
                    let offerPrice = price - (price * bestOff) / 100;
                    db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ name: offer.items },
                        {
                            $set: {
                                OldPrice: price,
                                price: offerPrice,
                                offerPercentage: bestOff,
                                offer: true,
                                ProductOffer: true,
                            },
                        }
                    )
                } else {


                    console.log('else case price setting');

                    let price = productoffer[0].price;

                    let offerPrice = price - (price * comingPercentage) / 100;

                    db.get().collection(collection.PRODUCT_COLLECTION).updateOne(
                        {
                            name: offer.items,
                        },
                        {
                            $set: {
                                OldPrice: price,
                                price: offerPrice,
                                offerPercentage: bestOff,
                                offer: true,
                                ProductOffer: true,
                            },
                        }
                    );
                }
            }
            resolve({ Exist: false });
        });
    },





    deleteProOffer: (offId, Product) => {
        console.log(Product,'product delettttttttttttttteeeeeeeeeeeeeee');
        console.log(offId,'idddddddddddddddddddddddddddddddddd');

        return new Promise(async (resolve, reject) => {
            let items = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match: { name: Product },
                },
            ]).toArray();

            console.log(items, 'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');

            let productPrice = items[0].OldPrice;
            let category = items[0].category;
            let proName = items[0].name;

            let CateofferExist = await db.get().collection(collection.OFFERS_COLLECTION).findOne({ offerItem: category });

            console.log(CateofferExist, 'categoryrrryyrr offerre exitttt');

            if (CateofferExist) {

                let percentage = parseInt(CateofferExist.discount);
                let price = items[0].OldPrice;
                let offerPrice = price - (price * percentage) / 100;

                db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ name: proName },
                    {
                        $set: {
                            OldPrice: price,
                            price: offerPrice,
                            offerPercentage: percentage,
                            offer: true,
                            ProductOffer: false,
                        },
                    }
                )
                db.get().collection(collection.PRODUCTOFFERS_COLLECTION).deleteOne({ _id: ObjectId(offId) }).then(() => {
                    resolve();
                })

            } else {
                let proId = items[0]._id + "";
                console.log(proId,'prodIddddddddddddddddddddddddddddd');

                await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: ObjectId(proId)},
                    {
                        $set: {
                            price: productPrice,
                            offer: false,
                            ProductOffer: false,
                            offerPercentage:null
                        },
                    }
                );

                db.get().collection(collection.PRODUCTOFFERS_COLLECTION).deleteOne({ _id: ObjectId(offId) }).then(() => {
                    resolve();
                });
            }
        });
    },




    viewOfferPro: () => {
        return new Promise(async (resolve, reject) => {
            let result = await db.get().collection(collection.PRODUCTOFFERS_COLLECTION).find().toArray()
            resolve(result)
        })
    },
}