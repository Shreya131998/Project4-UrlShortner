const validUrl=require("valid-url")
const urlModel=require("../model/urlModel")
const shortid=require("shortid")



const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
  19870,
  "redis-19870.c301.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("9sWSgERYp488ZgsjqBhZRSnzWThtAb8c", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});



//1. connect to the server
//2. use the commands :

//Connection setup for redis

 const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
 const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



const isValid = function (value) {
    if (typeof value == "undefined" || value == null) return false;
    if (typeof value == "string" && value.trim().length == 0) return false;
    return true;
  };
  const isValidRequestBody = function (body) {
    return Object.keys(body).length > 0;
  };
  

const baseUrl='http://localhost:3000'
const createUrl=async function(req,res){
  try{
    if(Object.keys(req.query).length>0){
        return res.status(400).send({status:false,message:"Filtering not allowed"})
    }    

    let body=req.body  
    if(!isValidRequestBody(body)){
        return res.status(400).send({status:false,message:"Please provide details"})
    } 

    const {longUrl}=req.body 
    if(!isValid(longUrl)){
        return res.status(400).send({status:false,message:"Please provide longUrl"})
    }
    
   
    let correctUrl=longUrl.trim()
    console.log(correctUrl===longUrl)
    
    if(!validUrl.isWebUri(correctUrl)){
        return res.status(400).send({status:false,message:"Invalid longUrl"})
    }
    
    let cachedData=await GET_ASYNC(`${correctUrl}`)
    if(cachedData){
        
        return res.status(200).send({status:true,data:JSON.parse(cachedData)})
    }
    let dbdata=await urlModel.findOne({longUrl:correctUrl}).select({_id:0,__v:0})
    console.log(dbdata)
    if(dbdata){
        await SET_ASYNC(`${correctUrl}`,JSON.stringify(dbdata))
        await SET_ASYNC(`${dbdata.urlCode}`,JSON.stringify(correctUrl))
        return res.status(200).send({status:true,data:dbdata})
    }
    
    if(!validUrl.isWebUri(baseUrl)){
        return res.status(400).send({status:false,message:"Invalid base URL"})
    }
    const urlCode=shortid.generate() //generate unique id for url
    
    let newUrl=urlCode.toLowerCase() 
    
    
    const uniqueUrlCode=await urlModel.findOne({urlCode:newUrl})
    if(uniqueUrlCode){
        return res.status(400).send({status:false,message:"urlCode already registered"})
    }
    
    const shortUrl=baseUrl+'/'+urlCode.toLowerCase()
    const validShortUrl=await urlModel.findOne({shortUrl:shortUrl})
    if(validShortUrl){
        return res.status(400).send({status:false,message:"Short Url is already registered"})
    }
    body.longUrl=correctUrl
    body.shortUrl=shortUrl
    body.urlCode=newUrl

    
    
    console.log(body)
    await urlModel.create(body)
     await SET_ASYNC(`${correctUrl}`,JSON.stringify(body))
     await SET_ASYNC(`${newUrl}`,JSON.stringify(correctUrl))
    let data1=await urlModel.findOne({longUrl:correctUrl,shortUrl:shortUrl,urlCode:newUrl}).select({_id:0,__v:0})
    console.log(data1)
    return res.status(201).send({status:true,message:"created Successfully",data:data1})

    }
    catch(err){
        return res.status(500).send({status:false,message:err.message})
    }

}

const getUrl=async function(req,res){
    try{
        let {urlCode}=req.params 
        let verifyUrl=shortid.isValid(urlCode)
        if(!verifyUrl){
            return res.status(400).send({status:false,message:"Not a valid url code"})
        }
        if(Object.keys(req.query).length>0){
            return res.status(400).send({status:false,message:"Filtering not allowed"})
        }

    
        
        let cachedData=await GET_ASYNC(`${urlCode}`)
        
        if(cachedData){
            
            
             
            console.log(1)
        
            return res.status(302).redirect(JSON.parse(cachedData))
        }
        let url =await urlModel.findOne({urlCode:urlCode})
        console.log(url)
        if(!url){
            
            
            return res.status(404).send({status:false,message:"urlCode not found"})
        }
        else{
            await SET_ASYNC(`${urlCode}`,JSON.stringify(url.longUrl))
            return res.status(302).redirect(url.longUrl)
            
        }

    }
    catch(err){
        return res.status(500).send({status:false,message:err.message})
        
    }
}



module.exports={createUrl,getUrl}