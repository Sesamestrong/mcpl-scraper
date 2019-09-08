const request=require("request-promise").defaults({jar:true});
const cheerio=require("cheerio");
(require("dotenv"))();
(async ()=>{
  const loginPage=await request.get("https://montgomerycountymd.gov/library/catalog/login.html");
  const $=cheerio.load(loginPage);
  const formData=$("body").find('input[name="t:formdata"]').attr("value");
  console.log(formData);
  try{(await request.post({url:"https://mdpl.ent.sirsi.net/client/en_US/catalog/search/patronlogin.loginpageform/CATALOG?&t:ac=$002f$002fmdpl.ent.sirsi.net$002fclient$002fen_US$002fcatalog$002fsearch$002faccount$003f",formData:{
    "t:formdata":formData,
    "j_username":process.env.CARD_NUMBER,
    "j_password":process.env.PIN,
    "profileAuthServer":"SYMWS",
  }}));
  } catch(err){
    //302 Error is expected - It means that the server is trying to redirect the user to the account page
    console.log("302");
  }
  //At this point, you are logged into MCPL
  //Any request has the correct authentication built-in now
  {
    const catalogPage=await request.get("https://mdpl.ent.sirsi.net/client/en_US/catalog/search/");
    const $=cheerio.load(catalogPage);
    const welcomeText=$("body").find("span.welcome").text();
    console.log(welcomeText);
  }
})()
