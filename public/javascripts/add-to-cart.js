
function addToCart(proId){
    $.ajax({
        url:'/add-to-cart/'+proId,
        method:'get',
        success:(Response)=>{
            alert(Response)
        }
    })
}
