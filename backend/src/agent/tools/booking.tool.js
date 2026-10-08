const { bookDietitianAppointmentApi } = require("../apis/booking.api");
const { checkDietitianAvailabilityApi } = require("../apis/schedule.api");

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
      confirmedByUser: {
        type: "BOOLEAN",
        description:
          "True ONLY if the patient has explicitly confirmed booking this specific slot and fee (e.g. 'yes confirm', 'proceed to book'). Set to false if the patient has not explicitly confirmed yet so slot details and fee can be proposed first.",
      },
    },
    required: ["dietitianName", "date", "time"],
  },
};

async function executeBookDietitianAppointment(args = {}, context = {}) {
  try {
    const { dietitianName, date, time, consultationType, confirmedByUser } = args;

    // Explicit confirmation gate: verify slot availability and require confirmation before mutation
    if (confirmedByUser === false) {
      const avail = await checkDietitianAvailabilityApi({
        dietitianName,
        date,
        userId: context.userId || context.authUserId,
      });

      const fee = Number(
        avail.dietitian?.onlineFee ??
          avail.dietitian?.fees ??
          avail.dietitian?.fee ??
          0
      );
      const card = avail.success
        ? {
            type: "slot_booking_card",
            data: {
              dietitian: avail.dietitian,
              selectedDate: avail.selectedDate || date,
              availableSlots: avail.availableSlots || [],
              dailySchedules: avail.dailySchedules || [],
              freeDates: avail.freeDates || [],
            },
          }
        : null;

      return {
        success: true,
        requiresConfirmation: true,
        cards: card ? [card] : [],
        data: {
          dietitianName: avail.dietitian?.name || dietitianName,
          date,
          time,
          fee,
          consultationType: consultationType || "Online",
          requiresConfirmation: true,
        },
        message: `Proposed consultation with ${avail.dietitian?.name || dietitianName} on ${date} at ${time} (${consultationType || "Online"}, fee ₹${fee}). Please confirm with the patient before finalizing the booking reservation.`,
      };
    }

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

    const isPaymentCompleted =
      typeof result.paymentStatus === "string" &&
      result.paymentStatus.toLowerCase() === "completed";

    const cards = [];
    if (isPaymentCompleted) {
      cards.push({
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
      });
    }

    return {
      success: true,
      data: result,
      cards,
      openPayment: true,
      openPaymentDetails: result.paymentDetails,
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
