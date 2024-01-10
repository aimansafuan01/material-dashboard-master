import * as BrooderDB from '../db/brooderDB.js';
import * as SurveillanceDB from '../db/surveillanceDB.js';
import { sendAlert } from '../mailer.js';

export const getAllBrooderPage = async (req, res) => {
  try {
    const allBrooder = await BrooderDB.getAllBrooder();
    res.status(200)
      .render('brooder-record', { allBrooder });
  } catch (error) {
    console.error(error);
    res.status(500)
      .send('Internal Server Error');
  }
};

export const getBrooderForm = async (req, res) => {
  const coop = {
    id: req.query.id
  };
  res.status(200)
    .render('create-brooder-record', coop);
};

// Submit Brooder Record
export const submitBrooderForm = async (req, res) => {
  try {
    const brooderData = {
      brooderID: req.body.brooderID,
      numDeadChick: req.body.numDeadChick
    };

    const brooderSurveillance = {
      brooderID: req.body.brooderID,
      incubatorID: null,
      coopID: null
    };
    await BrooderDB.submitBrooderRecord(brooderData);
    const resultUpdateMRChick = await BrooderDB.updateBrooderMR(brooderData);
    await BrooderDB.minusBrooderNumChick(brooderData);
    const surveillanceThreshold = await SurveillanceDB.getSurveillance();

    if (resultUpdateMRChick[1] > surveillanceThreshold[0].chickMRThreshold) {
      await SurveillanceDB.submitSurveillanceRecord(brooderSurveillance);
      sendAlert();
    }
    res.status(200)
      .redirect('/brooder/view');
  } catch (error) {
    console.error('Error during submitting brooder record', error);
    res.status(500)
      .send('Internal Server Error');
  }
};