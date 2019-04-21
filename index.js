const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

puppeteer.launch().then(async browser => {
  try {
    const page = await browser.newPage();
    // change this page if you need to get infant,primary, secondary etc
    await page.goto(
      "https://www.birmingham.gov.uk/directory/24/birmingham_schools/category/318"
    );

    // see puppetteer docs but evaluate is where the main work is done.
    const schoolLinks = await page.evaluate(() => {
      const linkSelector = document.querySelectorAll(
        "#content > nav > ul > li > a"
      );

      // links are nodes
      const links = Array.from(linkSelector);
      const res = links.map(item => item.getAttribute("href"));
      return res;
    });

    // used to store all the school results from the scrape
    let allSchoolsArray = [];

    for (school of schoolLinks) {
      await page.goto(`https://www.birmingham.gov.uk/${school}`);

      /**
       * take the dl element and loop through its children.
       * Some of the key(DT) elements are blanks so need some massaging.
       */
      const currentSchool = await page.evaluate(() => {
        // crazy people used dl instead of table
        const schoolDetailsSelector = document.querySelector("#content > dl")
          .children;

        let key; // used to keep track of object key
        const schoolDetails = Array.from(schoolDetailsSelector)
          .map(item => [item.tagName, item.innerText])
          .reduce((accum, curr) => {
            // reduce is turning a list of [dt, value] / [dd, value] into an object
            const [tag, text] = curr;
            // some keys can be blank but have values hence the use of key to keep a track of the last key if used even
            // this will negate a blank key
            if (text && tag === "DT") {
              key = text;
              accum[key] = "";
              return accum;
            } else if (tag === "DD") {
              accum[key] += `${text} `;
              return accum;
            } else {
              return accum; // always return the object!
            }
          }, {});

        return schoolDetails;
      });

      // log out the results, a spinner would work but I like to see progress!
      await console.log(currentSchool);

      await allSchoolsArray.push(currentSchool);
    }
    await console.log("done!!! ✨✨🎉🎉");
    await browser.close();

    // write the result to a file
    fs.writeFileSync(
      "./schoolDetails.js",
      JSON.stringify(allSchoolsArray, null, 2)
    );
  } catch (error) {
    console.log(error);
  }
});
