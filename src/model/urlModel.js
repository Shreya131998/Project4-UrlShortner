const mongoose=require("mongoose")
const urlSchema=new mongoose.Schema({
    
    longUrl:{type:String,required:true,trim:true},
    shortUrl:{type:String,required:true,unique:true},
    urlCode:{type:String,required:true,trim:true,lowercase:true,unique:true}
})

module.exports=mongoose.model("Url",urlSchema)