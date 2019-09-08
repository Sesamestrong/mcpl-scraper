const requestPromise = require("request-promise");
const cheerio = require("cheerio");
require("dotenv").config();



const loginMCPL = (async (jar = requestPromise.jar()) => {
  const request = requestPromise.defaults({
    jar
  });
  const loginPage = await request.get("https://montgomerycountymd.gov/library/catalog/login.html");
  const $ = cheerio.load(loginPage);
  const formData = $("body").find('input[name="t:formdata"]').attr("value");
  try {
    (await request.post({
      url: "https://mdpl.ent.sirsi.net/client/en_US/catalog/search/patronlogin.loginpageform/CATALOG?&t:ac=$002f$002fmdpl.ent.sirsi.net$002fclient$002fen_US$002fcatalog$002fsearch$002faccount$003f",
      form: {
        "t:formdata": formData,
        "j_username": process.env.CARD_NUMBER,
        "j_password": process.env.PIN,
        "profileAuthServer": "SYMWS",
      }
    }));
  } catch (err) {
    //302 Error is expected - It means that the server is trying to redirect the user to the account page
    console.log("302");
  }
  //At this point, you are logged into MCPL
  //Any request has the correct authentication built-in now

  //Ex: Show welcome message to MCPL user
  {
    const catalogPage = await request.get("https://mdpl.ent.sirsi.net/client/en_US/catalog/search/");
    const $ = cheerio.load(catalogPage);
    const welcomeText = $("body").find("span.welcome").text();
    console.log(welcomeText);
  }
  return jar;
});

const loginSafari = (async (jar = requestPromise.jar()) => {
  const request = requestPromise.defaults({
    jar
  });
  const loginPage = await request.get("https://proxy.montgomerylibrary.org/login");
  const formData = {
    url: "https://proquest.safaribooksonline.com/?uicode=mtgmrypl",
    user: process.env.CARD_NUMBER,
    pass: process.env.PIN,
  };
  try{
  await request.post({
    url: "https://proxy.montgomerylibrary.org/login",
    form:formData,
  });
  }catch(err){
    console.log("302");
  }

  //Get Safari cookie
  await request.get("https://proquest-safaribooksonline-com.proxy.montgomerylibrary.org/?uicode=mtgmrypl");

  const mainPage=(await request.get("https://proquest-safaribooksonline-com.proxy.montgomerylibrary.org/"));
  const $= cheerio.load(mainPage);
  const welcomeMessage=$("body").find(".shdwbox1inner h5").text();
  console.log(welcomeMessage);

  return jar;
});
loginSafari();
loginMCPL();
