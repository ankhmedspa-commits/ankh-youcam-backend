const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin"
};

function sendJson(data, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request) {
  try {
    const body = await request.json();

    const imageBase64 = body.imageBase64;
    const customer = body.customer || {};
    const answers = body.answers || {};

    if (!imageBase64) {
      return sendJson({
        ok: false,
        message: "Missing selfie image."
      }, 400);
    }

    const cleanBase64 = String(imageBase64).replace(
      /^data:image\/[a-zA-Z]+;base64,/,
      ""
    );

    /*
      TEMPORARY TEST MODE:
      Keep USE_MOCK=true in Vercel first.
      This confirms Shopify can talk to Vercel before using paid YouCam credits.
    */
    if (process.env.USE_MOCK === "true") {
      return sendJson({
        ok: true,
        raw: getMockYouCamResult(),
        customer,
        answers
      });
    }

    /*
      REAL YOUCAM CONNECTION:
      Your YouCam docs may use:
      1. File API upload
      2. AI Task API create task
      3. Poll task result

      Perfect Corp’s Skin Analysis flow supports photo upload/capture,
      AI scanning, and structured JSON results.
      Put the exact endpoint from your YouCam dashboard in:
      YOUCAM_SKIN_API_URL
    */

    if (!process.env.YOUCAM_API_KEY) {
      return sendJson({
        ok: false,
        message: "Missing YOUCAM_API_KEY in Vercel environment variables."
      }, 500);
    }

    if (!process.env.YOUCAM_SKIN_API_URL) {
      return sendJson({
        ok: false,
        message: "Missing YOUCAM_SKIN_API_URL in Vercel environment variables."
      }, 500);
    }

    const youcamResponse = await fetch(process.env.YOUCAM_SKIN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

        /*
          Change this header if your YouCam docs say to use x-api-key.
          Example:
          "x-api-key": process.env.YOUCAM_API_KEY
        */
        "Authorization": `Bearer ${process.env.YOUCAM_API_KEY}`
      },
      body: JSON.stringify({
        image: cleanBase64
      })
    });

    const youcamData = await youcamResponse.json();

    if (!youcamResponse.ok) {
      return sendJson({
        ok: false,
        message: "YouCam analysis failed.",
        details: youcamData
      }, youcamResponse.status);
    }

    return sendJson({
      ok: true,
      raw: youcamData,
      customer,
      answers
    });

  } catch (error) {
    return sendJson({
      ok: false,
      message: "Server error.",
      error: error.message
    }, 500);
  }
}

function getMockYouCamResult() {
  return {
    status: 200,
    data: {
      error: null,
      results: {
        output: [
          {
            type: "all",
            score: 70.6,
            url: null
          },
          {
            type: "skin_age",
            score: 57,
            url: null
          },
          {
            type: "hd_skin_type",
            region: "whole",
            skin_type: "Oily",
            url: null
          },
          {
            type: "hd_redness",
            ui_score: 98,
            raw_score: 99.14,
            mask_urls: []
          },
          {
            type: "hd_radiance",
            ui_score: 74,
            raw_score: 63.98,
            mask_urls: []
          },
          {
            type: "hd_age_spot",
            ui_score: 73,
            raw_score: 75.13,
            mask_urls: []
          },
          {
            type: "hd_texture",
            region: "whole",
            ui_score: 62,
            raw_score: 36.43,
            mask_urls: []
          },
          {
            type: "hd_pore",
            region: "whole",
            ui_score: 56,
            raw_score: 23.12,
            mask_urls: []
          },
          {
            type: "hd_moisture",
            ui_score: 59,
            raw_score: 20.6,
            mask_urls: []
          },
          {
            type: "hd_firmness",
            ui_score: 61,
            raw_score: 35.35,
            mask_urls: []
          },
          {
            type: "hd_acne",
            region: "whole",
            ui_score: 98,
            raw_score: 97.87,
            mask_urls: []
          },
          {
            type: "hd_oiliness",
            ui_score: 67,
            raw_score: 49.72,
            mask_urls: []
          }
        ]
      },
      task_status: "success"
    }
  };
}
