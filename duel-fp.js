// duel-fp.js
//
// Steps performed by this script:
//
// 1. Open the Duels page.
// 2. Try to read the player's EXACT dollar amount.
// 3. If exact dollars are found:
//      - > 200,000  -> send buyFashionPoints ONCE.
//      - <= 200,000 -> skip buyFashionPoints.
// 4. If exact dollars are NOT found:
//      - DO NOT make a decision based on dollars.
//      - Continue directly to Step 3 and send buyFashionPoints ONCE.
// 5. Send distributeAllFP.
// 6. The script does NOT repeatedly send either request.
//
// Important:
// - buyFashionPoints always uses fpToBuy=2201.
// - Both requests go to /ajax/train.php.
// - Playwright's existing logged-in browser session is used.


const DUELS_URL = 'https://v3.g.ladypopular.com/duels.php';
const TRAIN_URL = 'https://v3.g.ladypopular.com/ajax/train.php';


// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------

module.exports = async function runDuelFP(page) {

  console.log('');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log('⚔️ Starting Duel FP conversion/distribution...');
  console.log('────────────────────────────────────────────────────────────────────────────────');


  // ============================================================
  // STEP 1
  // Open the Duels page
  // ============================================================

  console.log('🌐 Step 1: Opening Duels page...');

  await page.goto(DUELS_URL, {
    waitUntil: 'domcontentloaded'
  });

  console.log('✅ Duels page loaded.');

  // Give the page a little time to finish populating its
  // dynamically loaded elements.
  await page.waitForTimeout(3000);


  // ============================================================
  // STEP 2
  // Find the EXACT dollar amount
  // ============================================================

  console.log('💰 Step 2: Checking exact dollar amount...');

  let exactDollars = null;

  try {

    // The exact dollar amount is stored in the title attribute
    // of .player-dollars after the page's JavaScript runs.
    //
    // Example from your inspect data:
    //
    // title="<span ...>303,324</span>"
    //
    // We read the title attribute itself rather than the
    // visible "303.3k" text.

    const dollarTitle = await page
      .locator('.player-dollars')
      .getAttribute('title');

    if (dollarTitle) {

      console.log(`🔎 Dollar title found: ${dollarTitle}`);

      // Extract the number from the HTML contained in title.
      //
      // Example:
      // <span class='icon-currency-s icon-currency-dollar'>303,324</span>
      //
      // becomes:
      // 303324

      const dollarMatch = dollarTitle.match(/>([\d,]+)</);

      if (dollarMatch) {

        exactDollars = parseInt(
          dollarMatch[1].replace(/,/g, ''),
          10
        );

        console.log(`💵 Exact dollars found: ${exactDollars.toLocaleString()}`);

      } else {

        console.log(
          '⚠️ Dollar title was found, but the exact dollar number could not be extracted.'
        );

      }

    } else {

      console.log(
        '⚠️ Exact dollar amount was not found.'
      );

    }

  } catch (error) {

    // IMPORTANT:
    // Failure to find the dollar amount must NOT stop the script.
    //
    // According to your rule, we simply continue to Step 3
    // and Step 4 when the exact dollar amount cannot be found.

    console.log(
      `⚠️ Could not read exact dollars: ${error.message}`
    );

  }


  // ============================================================
  // STEP 3
  // Convert dollars to FP when appropriate
  // ============================================================

  let shouldBuyFP = false;

  if (exactDollars === null) {

    // Exact dollars were NOT found.
    //
    // We must NOT make a dollar-based decision.
    //
    // Your instruction is to continue directly to Step 3
    // and therefore send the request once.

    console.log(
      '⚠️ Exact dollars unavailable.'
    );

    console.log(
      '➡️ No dollar-based decision will be made.'
    );

    console.log(
      '➡️ Continuing to Step 3 as instructed.'
    );

    shouldBuyFP = true;

  } else if (exactDollars > 200000) {

    // Exact dollars found AND greater than 200,000.
    //
    // Send buyFashionPoints ONCE.

    console.log(
      `💰 Exact dollars (${exactDollars.toLocaleString()}) are greater than 200,000.`
    );

    console.log(
      '➡️ Step 3 will be executed.'
    );

    shouldBuyFP = true;

  } else {

    // Exact dollars found AND 200,000 or less.
    //
    // Skip Step 3.

    console.log(
      `💰 Exact dollars (${exactDollars.toLocaleString()}) are 200,000 or less.`
    );

    console.log(
      '⏭️ Step 3 will be skipped.'
    );

    shouldBuyFP = false;

  }


  if (shouldBuyFP) {

    console.log('');
    console.log('💳 Sending buyFashionPoints request...');
    console.log('📦 type=buyFashionPoints');
    console.log('📦 fpToBuy=2201');
    console.log('🔄 Sending request ONCE...');


    try {

      const response = await page.request.post(
        TRAIN_URL,
        {
          form: {
            type: 'buyFashionPoints',
            fpToBuy: '2201'
          },
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );


      const responseText = await response.text();

      console.log(
        `📡 buyFashionPoints HTTP status: ${response.status()}`
      );

      console.log(
        `📨 buyFashionPoints response: ${responseText}`
      );


      if (!response.ok()) {

        throw new Error(
          `buyFashionPoints request returned HTTP ${response.status()}`
        );

      }


      // Your observed response contains:
      //
      // {
      //     "status": 1,
      //     ...
      // }
      //
      // We inspect status when the response is JSON.

      try {

        const data = JSON.parse(responseText);

        if (data.status === 1) {

          console.log(
            '✅ buyFashionPoints request succeeded.'
          );

        } else {

          console.log(
            `⚠️ buyFashionPoints returned status: ${data.status}`
          );

        }

      } catch {

        console.log(
          '⚠️ Could not parse buyFashionPoints response as JSON.'
        );

      }

    } catch (error) {

      console.log(
        `❌ buyFashionPoints request failed: ${error.message}`
      );

      // Stop here because Step 4 should not silently run if
      // the conversion request itself failed.
      //
      // This prevents us from pretending the conversion worked.

      throw error;
    }

  }


  // ============================================================
  // STEP 4
  // Distribute all FP
  // ============================================================

  console.log('');
  console.log('📊 Step 4: Distributing all FP...');
  console.log('📦 type=distributeAllFP');
  console.log('🔄 Sending distributeAllFP request ONCE...');


  try {

    const response = await page.request.post(
      TRAIN_URL,
      {
        form: {
          type: 'distributeAllFP'
        },
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    );


    const responseText = await response.text();

    console.log(
      `📡 distributeAllFP HTTP status: ${response.status()}`
    );

    console.log(
      `📨 distributeAllFP response: ${responseText}`
    );


    if (!response.ok()) {

      throw new Error(
        `distributeAllFP request returned HTTP ${response.status()}`
      );

    }


    try {

      const data = JSON.parse(responseText);

      if (data.status === 1) {

        console.log(
          '✅ distributeAllFP request succeeded.'
        );

      } else {

        console.log(
          `⚠️ distributeAllFP returned status: ${data.status}`
        );

      }

    } catch {

      console.log(
        '⚠️ Could not parse distributeAllFP response as JSON.'
      );

    }

  } catch (error) {

    console.log(
      `❌ distributeAllFP request failed: ${error.message}`
    );

    throw error;

  }


  // ============================================================
  // FINISHED
  // ============================================================

  console.log('');
  console.log('✅ Duel FP conversion/distribution completed.');
  console.log('────────────────────────────────────────────────────────────────────────────────');
};
