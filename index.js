const requestPromise = require("request-promise");
const cheerio = require("cheerio");
const scrape = require("website-scraper");
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
  try {
    await request.post({
      url: "https://proxy.montgomerylibrary.org/login",
      form: formData,
    });
  } catch (err) {
    console.log("302");
  }

  //Get Safari cookie
  await request.get("https://proquest-safaribooksonline-com.proxy.montgomerylibrary.org/?uicode=mtgmrypl");

  const mainPage = (await request.get("https://proquest-safaribooksonline-com.proxy.montgomerylibrary.org/"));
  const $ = cheerio.load(mainPage);
  const welcomeMessage = $("body").find(".shdwbox1inner h5").text();
  console.log(welcomeMessage);

  return jar;
});

const bookIdFromUrl = (bookUrl => bookUrl.match(/\/([^\/]+)$/)[1]);

const getBookChapterList = (async (url, jar) => {
  const request = requestPromise.defaults({
    jar
  });
  const innerPage = await request.get(url);
  const bookId = bookIdFromUrl(url);
  //console.log("bookId", bookId);
  const $ = cheerio.load(innerPage);
  const chapterLinks = $("#ajaxtoc").find("a").map((_, i) => $(i).attr("href").match(/([^\/]+)$/)[1]).toArray();
  //console.log(chapterLinks[0]);
  //console.log("chapterLink",chapterLinks.length,chapterLinks instanceof Array);
  return chapterLinks;
});

const getPrintUrlFromIds = ((bookId, chapterId) => "https://proquest-safaribooksonline-com.proxy.montgomerylibrary.org/print?xmlid=" + bookId + "%2F" + chapterId);

const cachePagesOfBook = (async (bookUrl, jar) => {
  const bookId = bookIdFromUrl(bookUrl);
  const chapterIds = await getBookChapterList(bookUrl, jar);
  const scraperList = chapterIds.map((chapterId) =>( {
    url: getPrintUrlFromIds(bookId, chapterId),
    filename: chapterId + ".htm",
  }));
  //Copied partially from https://ourcodeworld.com/articles/read/374/how-to-download-the-source-code-js-css-and-images-of-a-website-through-its-url-web-scraping-with-node-js
  await scrape({
    urls: [bookUrl,...scraperList],
    directory: './books/' + bookId,
    subdirectories: [{
        directory: 'img',
        extensions: ['.jpg', '.png', '.svg']
      },
      {
        directory: 'js',
        extensions: ['.js']
      },
      {
        directory: 'css',
        extensions: ['.css']
      },
      {
        directory: 'fonts',
        extensions: ['.woff', '.ttf']
      }
    ],
    sources: [{
        selector: 'img',
        attr: 'src'
      },
      {
        selector: 'link[rel="stylesheet"]',
        attr: 'href'
      },
      {
        selector: 'script',
        attr: 'src'
      }
    ],
    requestConcurrency:100,
    request:{jar},

  });
});

(async () => {
  let jar = requestPromise.jar();
  jar = await loginSafari();
  //await loginMCPL();
  const exampleLink = process.argv[2]||"https://proquest-safaribooksonline-com.proxy.montgomerylibrary.org/book/web-development/css/9781449325053";
  console.log(exampleLink);
  //console.log(await requestPromise(exampleLink,{jar}));
  //const firstPageLink = await getBookChapterList(exampleLink, jar);
  await cachePagesOfBook(exampleLink,jar);
  console.log(`
----------------------------------------------------------------





GOT PAGES




----------------------------------------------------------------
`);
})();
