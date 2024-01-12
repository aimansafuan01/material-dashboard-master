import * as IncubatorDB from '../db/incubatorDB.js';
import * as BrooderDB from '../db/brooderDB.js';
import * as RecordIncubatorDB from '../db/record-incubatorDB.js';
import * as SurveillanceDB from '../db/surveillanceDB.js';
import { sendAlert } from '../mailer.js';

// View Incubator
export const getIncubatorPage = async (req, res) => {
  const allIncubator = await IncubatorDB.getAllIncubator();
  const hatchingDate = await IncubatorDB.getHatchingDate();
  res.status(200)
    .render('incubator-record', { allIncubator, hatchingDate });
};

// Get Incubator Tray Record Page
export const getIncubatorTrayForm = async (req, res) => {
  const data = {
    id: req.query.id
  };
  const incubatorResult = await IncubatorDB.getIncubatorRecord(data);
  const numEggsInTray = await RecordIncubatorDB.getTrayToBasketRecord(data);
  res.status(200)
    .render('create-tray-record', { data, incubatorResult, numEggsInTray });
};

// Get Incubator Hatch Record Page
export const getIncubatorHatchForm = async (req, res) => {
  const incubatorID = req.query.id;
  const numEgg = await RecordIncubatorDB.getNumEggsInBasket(incubatorID);
  const numEggData = numEgg.map((data) => data.numEggs);
  const data = {
    id: incubatorID,
    numEgg: numEggData.length > 0 ? numEggData : 0
  };

  res.render('create-hatch-record', data);
};

// Submit Incubator Tray Record
export const submitIncubatorTrayForm = async (req, res) => {
  const trayData = {
    incubatorID: req.body.incubatorID,
    dateIn: req.body.dateIn,
    trayID: req.body.trayID,
    numEggs: req.body.numEggs
  };
  await RecordIncubatorDB.submitTrayRecord(trayData);
  await IncubatorDB.updateIncubatorEgg(trayData);
  res.status(200)
    .redirect('/incubator/view');
};

// Submit Incubator Hatch Record
export const submitIncubatorHatchForm = async (req, res) => {
  const incubatorID = req.body.incubatorID;
  const dateHatch = req.body.dateOut;
  const eggInBasket = req.body.numEgg;
  const notHatch = req.body.notHatch;
  const brooderID = req.body.brooderID;
  const numChick = +eggInBasket - +notHatch;
  const hatchRate = Number((+numChick / +eggInBasket) * 100).toFixed(2);

  try {
    const brooderData = {
      brooderID,
      numChick
    };

    const incubatorData = {
      incubatorID,
      hatchRate,
      eggInBasket
    };

    const incubatorSurveillance = {
      coopID: null,
      brooderID: null,
      incubatorID
    };

    const hatchData = {
      dateHatch,
      numEgg: eggInBasket,
      numHatch: numChick,
      numNotHatch: notHatch,
      hatchRate,
      incubatorID,
      brooderID
    };

    await BrooderDB.addChickToBrooder(brooderData);
    await IncubatorDB.updateIncubator(incubatorData);
    await RecordIncubatorDB.submitHatchRecord(hatchData);
    const surveillanceThreshold = await SurveillanceDB.getSurveillance();

    if (hatchRate < surveillanceThreshold[0].hatchingRateThreshold) {
      await SurveillanceDB.submitSurveillanceRecord(incubatorSurveillance);
      sendAlert();
    }

    res.status(200)
      .redirect('/incubator/view');
  } catch (error) {
    console.error('Error during submitting hatch record', error);
    res.status(500)
      .send('Internal Server Error');
  }
};
