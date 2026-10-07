const { bookDietitianAppointmentApi } = require("../apis/booking.api");

const bookDietitianAppointmentDeclaration = {
  name: "book_dietitian_appointment",
  description:
    "Book a consultation slot with a verified dietitian for a specific date and time.",
  parameters: {
    type: "OBJECT",
    properties: {
      dietitianName: {
        type: "STRING",
        description: "Name of the dietitian (e.g. Dr. Arjun Reddy, Dr. Zara Ahmed)",
      },
      date: {
        type: "STRING",
        description:
          "Date in YYYY-MM-DD format, or relative expression like tomorrow, today, october 10",
      },
      time: {
        type: "STRING",
        description:
          "Time slot in HH:MM format between 09:00 and 20:00 (e.g. 10:30, 14:00)",
      },
      consultationType: {
        type: "STRING",
        enum: ["Online", "In-person"],
        description: "Consultation mode (Online or In-person). Defaults to Online.",
      },
    },
    required: ["dietitianName", "date", "time"],
  },
};

async function executeBookDietitianAppointment(args = {}, context = {}) {
  try {
    const { dietitianName, date, time, consultationType } = args;

    const result = await bookDietitianAppointmentApi({
      dietitianName,
      date,
      time,
      consultationType: consultationType || "Online",
      userId: context.userId,
      authUserId: context.authUserId,
    });

    if (!result.success) {
      return {
        success: false,
        cards: [],
        message: result.message,
      };
    }

    const card = {
      type: "booking_confirmation_card",
      data: {
        bookingId: result.bookingId,
        dietitianName: result.dietitianName,
        date: result.date,
        time: result.time,
        consultationType: result.consultationType,
        fee: result.fee,
        paymentStatus: result.paymentStatus,
        paymentDetails: result.paymentDetails,
      },
    };

    return {
      success: true,
      data: result,
      cards: [card],
      openPayment: true,
      paymentDetails: result.paymentDetails,
      message: result.message,
    };
  } catch (error) {
    console.error("[executeBookDietitianAppointment Error]:", error);
    return {
      success: false,
      cards: [],
      message: "Failed to reserve consultation appointment.",
    };
  }
}

module.exports = {
  bookDietitianAppointmentDeclaration,
  executeBookDietitianAppointment,
};
