import { createElement, getValue, handleEvent } from "./dom.js";
import { wsCall } from "./jason.js";
import { shopList, version } from "./data.js";

let email = "";

/**
 * Callback for building shop admin buttons
 * @param {object} item list item
 * @returns {object} button text and link
 */
const shopButton = (item) => {
  if (item.hidden)
    return null;
  return {
    text: `B${item.id}`,
    link: `${item.url}/${item.admin}/index.php?controller=AdminLogin&redirect=AdminDashboard&email=${email}`,
  };
};

/**
 * Callback for building VM dashboards buttons
 * @param {object} item list item
 * @returns {object} button text and link
 */
const dashButton = (item) => {
  return {
    text: item.name,
    link: item.url.replace("https://", `https://${item.dashboard.user}:${item.dashboard.password}@`)
  };
};

function loadShopSelect() {
  const shopSelect = document.querySelector("#shopNo");
  shopList.filter(s => !s.hidden).forEach(shop => {
    const option = document.createElement("option");
    option.value = `shop=${shop.id}`;
    option.text = shop.url.split(".").slice(1).join(".");
    shopSelect.options.add(option);
  });
}

/**
 * Load a bar of buttons
 * @param {string} container parent element
 * @param {Array} list list of elements
 * @param {Function} callback function to build a button from list
 * @returns {void}
 */
function loadButtons(container, list, callback) {
  const buttons = document.querySelector(container);
  if (!buttons)
    return;
  list.forEach((item) => {
    const button = callback(item);
    if (!button)
      return;
    const link = createElement("a", button.text, {
      href: button.link,
      class: "btn btn-outline-light btn-sm",
      target: "_blank",
    });
    buttons.appendChild(link);
  });
}

/**
 * Return an object's property value
 * @param {object} o object to parse
 * @param {string} prop property name
 * @param {string} onError default value
 * @returns {string} property value or default
 */
function strval(o, prop, onError = "") {
  return o[prop] || onError;
}

/**
 * Open WEBCLI page in a new tab
 * @returns {void}
 */
async function searchClient() {
  const cclId = document.querySelector("#cclId");
  if (!cclId) 
    return;
  let email = cclId.value.trim();
  if (email === "") {
    alert("Veuillez saisir un no de client ou un e-mail !");
    return;
  }
  let ccl = 0;
  if (!isNaN(email)) {
    ccl = parseInt(email) || 0;
    if (ccl <= 0 || ccl > 99999999) {
      alert("Veuillez saisir un no de client valide !");
      return;
    }
    email = "";
  }
  const userOptions = await getUserOptions();
  const withInvoices = document.querySelector("#withInvoices").checked;
  const withBlog = document.querySelector("#withBlog").checked;
  const clientUrl = new URLSearchParams({
    prg: "WEBCLI",
    pass: "ATH54JK6FG8ES5V6H4JJK85HHAZDFENA",
    ccl,
    email,
    blog: withBlog ? "1" : "0",
    invoices: withInvoices ? "1" : "0",
    gs: userOptions.useGCS ? "1" : "0"
  }).toString();
  window.open(`https://www.vis-express.com/jason2.php?${clientUrl}`, "_blank");
}

/**
 * Search order reference using Jason WS
 * @returns {void}
 */
async function searchOrder() {
  const psOrderId = document.querySelector("#psOrderId");
  if (!psOrderId) 
    return;
  const orderRef = psOrderId.value;
  if (orderRef === "") {
    alert("Veuillez saisir un no de commande");
    return;
  }
  const result = document.querySelector("#orderResult");
  result.innerHTML = 'Recherche&nbsp;<div class="spinner-border spinner-border-sm" role="status"></div>';

  const wsResult = await wsCall({ prg: "REFCMD", reference: orderRef });
  if (wsResult.hasOwnProperty("wsError")) {
    result.innerHTML = wsResult.wsError;
  } else {
    const attribs = {
      class: "list-group-item"
    };
    const shopId = parseInt(strval(wsResult, "shop", "")) || 0;
    const idOrder = parseInt(strval(wsResult, "order_id", "")) || 0;
    if (shopId === 0 || idOrder === 0) {
      result.innerHTML = '<p class="text-warning">Commande introuvable !</p>';
      return;
    }
    result.innerHTML = "";

    const shopInfo = shopList.find((shop) => shop.id === shopId);
    const orderUrl = `${shopInfo.url}/${shopInfo.admin}/index.php?controller=AdminOrders&id_order=${idOrder}&vieworder`;
    const tracking = strval(wsResult, "tracking", "");
    const tracking_url = strval(wsResult, "tracking_url", "");
    const relayId = strval(wsResult, "relay_id", "");
    const mpOrderId = strval(wsResult, "marketplace_id", "");

    const info = createElement("ul", "", {
      class: "list-group list-group-flush"
    });

    info.appendChild(
      createElement(
        "li",
        `No Prestashop : <a href="${orderUrl}" target="_blank">B${shopId} P${idOrder}</a>`,
        attribs
      )
    );

    info.appendChild(
      createElement(
        "li",
        `Etat : ${strval(wsResult, "status", "")}`,
        attribs
      )
    );
    
    info.appendChild(
      createElement(
        "li",
        `Transporteur : ${strval(wsResult, "carrier", "")}`,
        attribs
      )
    );

    if (relayId !== "") {
      info.appendChild(
        createElement(
          "li",
          `No relais : ${ relayId.replaceAll("/!\\", "⚠️") }`,
          attribs
        )
      );
    }
    
    let link;
    if (tracking_url !== "")
      link = `<a href="${tracking_url}" target="_blank">${tracking}</a>`;
    info.appendChild(
      createElement(
        "li",
        `No Suivi : ${ link ? link : tracking }`,
        attribs
      )
    );
    
    if (mpOrderId !== "") {
      info.appendChild(
        createElement(
          "li",
          `No Cmd Marketplace : ${ mpOrderId }`,
          attribs
        )
      );        
    }

    info.appendChild(
      createElement(
        "li",
        `AR No : ${strval(wsResult, "ar", "")}`,
        attribs
      )
    );

    info.appendChild(
      createElement(
        "li",
        `Client No : ${strval(wsResult, "ccl", "")}`,
        attribs
      )
    );

    const bl = strval(wsResult, "bl", "");
    if (bl !== "") {
      info.appendChild(
        createElement(
          "li",
          `BL No : ${bl}`,
          attribs
        )
      )
    }

    const delivery = strval(wsResult, "delivery_date", "");
    const delay = strval(wsResult, "delivery_delay", "");
    if (delivery !== "") {
      info.appendChild(
        createElement(
          "li",
          `Livrée le : ${delivery} - ${delay}`,
          { class: attribs.class + ( delay.includes("OK") ? "" : " text-danger" ) }
        )
      )
    }

    const others = strval(wsResult, "others", "");
    if (others !== "") {
      info.appendChild(
        createElement(
          "li",
          `⚠️ Doublon : ${others} ⚠️`,
          attribs
        )
      );
    }

    result.appendChild(info);
  }
}

/**
 * Returns stock for reference
 * @returns {void}
 */
async function searchProduct() {
  const refProduct = document.querySelector("#refProduct");
  if (!refProduct) return;
  const reference = refProduct.value;
  if (reference.length !== 10) {
    alert("Veuillez saisir une référence produit valide");
    return;
  }
  const result = document.querySelector("#productResult");
  result.innerHTML = "Recherche...";

  let content = "";

  const wsResult = await wsCall({ prg: "stockreel", art: reference });
  if (wsResult.hasOwnProperty("wsError")) {
    content = wsResult.wsError;
  } else if (!wsResult.result) {
    content = "<p class='text-warning'>Pas de réponse de PVX</p>";
  } else if (wsResult.result.toLowerCase() === "ko") {
    content = `<p class="text-warning">${wsResult.message}</p>`;
  } else {
    const stock = parseInt(wsResult.sr) || 0;
    const delay = parseInt(wsResult.delai) || 0;
    content = `Stock Réel <a href="https://www.vis-express.fr/r/${reference}" class="btn btn-dark btn-sm" title="Afficher sur la boutique" target="_blank"><i class="bi bi-shop"></i></a> : `;
    const color = stock > 0 ? "text-bg-success" : "text-bg-warning";
    content += (stock !== 0) 
      ? `<span class="badge rounded-pill ${color}">${wsResult.sr} pièces</span>` 
      : `<span class="badge rounded-pill ${color}">En rupture</span> (Délai : ${delay} jours)`;
    if (wsResult.packs) {
      content += " soit";
      wsResult.packs.forEach(pack => {
        if (pack.units > 1) 
          content += `&nbsp;<span class="badge rounded-pill text-bg-secondary">${pack.stock} x ${pack.units} pièces</span>`;
      });
    }
  }
  result.innerHTML = content;
}

/**
 * Validate BSF file content
 * @param {string} fileContent - content of BSF text file
 * @returns {object}
 */
async function validateBSF(fileContent) {
  const alias = new Map()
    .set("client", "ccl")
    .set("commentaire", "comment");
  const data = { 
    ccl: "",
    bl: "",
    motif: "",
    attention: "",
    comment: "",
    rows: "",
    email: userOptions.email,
    checkCode: md5(userOptions.checkCode)
  };
  const rows = [];
  let readingRows = false;
  fileContent.split('\n').forEach(row => {
    if (row === "") return;
    const [ name, value ] = row.split(":").map(item => item.trim());
    if (readingRows) {
      rows.push(`${name.replace("- ", "")}~${value}`);
      return;
    }
    let k;
    if (alias.has(name.toLowerCase())) k = alias.get(name.toLowerCase());
    else k = name.toLowerCase();
    if (name.toLowerCase() === "produits") readingRows = true;
    else data[k] = value;
  });
  if (rows.length > 0) data.rows = rows.join("|");
  const wsResult = await wsCall({ prg: "VSP492", action: "validate", ...data });
  if (wsResult.valid === "ok") {
    return { valid: true, data }
  } else {
    return { valid: false, message: wsResult.message };
  }
}

/**
 * Submit BSF Via webservice
 * @returns {void}
 */
async function submitBSF() {
  const requestData = getValue("#dataBSF") || "";
  if (requestData === "") return;
  const wsResult = await wsCall({ prg: "VSP492", action: "submit" }, requestData);
  const success = wsResult.valid === "ok";
  const message = success
    ? "BSF enregistré"
    : `Erreur de validation : ${wsResult.message}`;
  const fileContents = document.querySelector("#bsfContent");
  const result = `<span class="text-${ success ? "success" : "danger" }"><strong>${message}</strong></span>`;
  fileContents.innerHTML = result;
  document.querySelector("#submitBSFBtn").style.display = "none";
}

/**
 * Open and parse BSF text file
 * @returns {void}
 */
async function openBSFFile() {
  let fileHandle;
  try {
    [ fileHandle ] = await window.showOpenFilePicker();
  } catch (error) { }
  if (!fileHandle) return;

  const file = await fileHandle.getFile();
  const fileContent = await file.text();
  const bsf = await validateBSF(fileContent);
  let result;
  if (bsf.valid) {
    result = `
    <p>
    Client : ${bsf.data.ccl}, BL No : ${bsf.data.bl}
    <br>Motif : ${bsf.data.motif}
    ${bsf.data.attention ? "<br>A l'attention : " + bsf.data.attention : "" }
    ${bsf.data.comment ? "<br>Commentaire : " + bsf.data.comment : "" }
    <br>References | Quantités :
    </p>
    <ul>${ bsf.data.rows.split("|").map(row => `<li>${row.split("~")[0]} | ${row.split("~")[1]}</li>`).join("")}</ul>
    <input type="hidden" id="dataBSF" value="${new URLSearchParams(bsf.data)}">
    `;
    document.querySelector("#submitBSFBtn").style.display = "block";
  } else {
    result = `<span class="text-danger"><strong>Validation impossible !</strong> ${bsf.message}</span>`
  }
  const fileContents = document.querySelector("#bsfContent");
  fileContents.innerHTML = result;
}

/**
 * Get warehouse stocks
 */
async function getStock() {
  const stock = document.querySelector("#stock");
  const wsResult = await wsCall({ prg: "INFOSCREEN" });
  if (wsResult.hasOwnProperty("nbr_pieces_dsp"))
    stock.innerHTML = `<strong>${wsResult.nbr_pieces_dsp} pièces en entrepôt</strong>`;
}

/**
 * Open a new tab to the client messages web page
 */
function showMessages() {
  const shop = document.querySelector("#shopNo").value;
  window.open(`https://www.vis-express.com/jason2.php?prg=MSGCLI&${shop}`);
}

/**
 * Open options panel
 */
function optionsPage() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL("options.html"));
  }
}

/**
 * Return user options
 * @returns { Promise<{ email: string, checkCode: string, boBtnBar: boolean, msgCmd: boolean, useGCS: boolean }> }
 */
async function getUserOptions() {
  return await chrome.storage.sync.get({
    email: "",
    checkCode: "",
    boBtnBar: false,
    msgCmd: false,
    useGCS: false,
  });
}

/**
 * Handler ENTER key
 * @param {object} e -event object
 * @returns {void}
 */
function handleEnter(e) {
  if (e.key !== "Enter")
    return;

  let reset = true;
  switch (e.target.id) {
    case "cclId":
      searchClient();
      break;
    case "psOrderId":  
      searchOrder();
      break;
    case "refProduct":
      searchProduct();
    default:
      reset = false;
  }
  if (reset) {
    e.target.value = "";
    e.target.focus();
  }
}

/**
 * Main app
 */

// Version label
document.querySelector("h1").title = `Version ${version}`;

// Get user options
const userOptions = await getUserOptions();

loadShopSelect()

if (userOptions.boBtnBar) {
  loadButtons("#boButtons", shopList, shopButton);
} else {
  document.querySelector("#backOffice").style.display = "none";
}

if (!userOptions.msgCmd)
  document.querySelector("#clientMsgs").style.display = "none";

/*if (userOptions.checkCode === "")
  document.querySelector("#formBSF").style.display = "none"; */

// Get total units in warehouse
await getStock();

// Wire-up events
if (userOptions.checkCode !== "") {
  handleEvent("#searchClientBtn", "click", searchClient);
  handleEvent("#cclId", "keypress", handleEnter);
} else {
  document.querySelector("#cclId").disabled = true;
  document.querySelector("#cclId").placeholder = "Réservé aux salariés VS";
  document.querySelector("#searchClientBtn").disabled = true;
}

handleEvent("#searchOrderBtn", "click", searchOrder);
handleEvent("#psOrderId", "keypress", handleEnter);

handleEvent("#searchProductBtn", "click", searchProduct);
handleEvent("#refProduct", "keypress", handleEnter);

handleEvent("#showMessagesBtn", "click", showMessages);
handleEvent("#optionsBtn", "click", optionsPage);

/* handleEvent("#openBSFBtn", "click", openBSFFile) */
/* handleEvent("#submitBSFBtn", "click", submitBSF); */