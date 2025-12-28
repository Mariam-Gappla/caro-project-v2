const Currency = require("../models/currency");
const addCurrency = async (req, res, next) => {
    try {
        const { num, price, title } = req.body;

        const currency = new Currency({
            num,
            price,
            title
        });

        await currency.save();

        res.status(201).json({
            success: true,
            message: "Currency added successfully",
            data: currency
        });

    } catch (err) {
        next(err)
    }
};
const getCurrencies = async (req, res,next) => {
  try {
    const currencies = await Currency.find().sort({ createdAt: -1 });

    res.status(200).json({
      code:200,
      success:true,
      data: currencies
    });

  } catch (err) {
   next(err)
  }
};

module.exports = {
    addCurrency,
    getCurrencies
}
