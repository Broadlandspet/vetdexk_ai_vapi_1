// src/controllers/contactController.js
'use strict';

const contactService = require('../services/contactService');
const logger = require('../utils/logger');

exports.submitContactQuery = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────

    const errors = [];

    // Name: required, 2–100 chars, letters/spaces/hyphens/apostrophes only
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters.');
    } else if (name.trim().length > 100) {
      errors.push('Name must not exceed 100 characters.');
    } else if (!/^[a-zA-Z\s'\-\.]+$/.test(name.trim())) {
      errors.push('Name contains invalid characters.');
    }

    // Email: required, valid format, max 255 chars
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      errors.push('Email is required.');
    } else if (email.trim().length > 255) {
      errors.push('Email must not exceed 255 characters.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Please provide a valid email address.');
    }

    // Phone: optional but if provided must be valid
    if (phone && phone.trim().length > 0) {
      const cleanPhone = phone.trim().replace(/[\s\-\(\)\+\.]/g, '');
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        errors.push('Phone number must be 7–15 digits.');
      }
    }

    // Message: required, 10–2000 chars
    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      errors.push('Message must be at least 10 characters.');
    } else if (message.trim().length > 2000) {
      errors.push('Message must not exceed 2000 characters.');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    // ── Sanitize ──────────────────────────────────────────────────────────────

    const sanitized = {
      name:    name.trim(),
      email:   email.trim().toLowerCase(),
      phone:   phone ? phone.trim() : null,
      message: message.trim()
    };

    // ── Save to DB ────────────────────────────────────────────────────────────

    const { id, createdAt } = await contactService.saveContactQuery(sanitized);

    // ── Send email (non-blocking — don't fail request if email fails) ─────────

    contactService.sendContactQueryEmail({
      id,
      ...sanitized,
      createdAt
    }).catch(err => {
      logger.error(`Contact query email failed for #${id}: ${err.message}`);
    });

    // ── Respond ───────────────────────────────────────────────────────────────

    return res.status(201).json({
      success: true,
      message: 'Your query has been submitted. We will get back to you shortly.',
      queryId: id
    });

  } catch (error) {
    logger.error('Error in submitContactQuery:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again later.'
    });
  }
};