"use client";

import { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate sending (no backend endpoint yet)
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    toast.success("Message sent! We'll get back to you soon.");
    setLoading(false);
  };

  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-[#1a4d42] via-[#1f6d5e] to-[#2f8b76] py-16 sm:py-20">
        <div className="page-container text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl font-display">
            Contact Us
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Have a question, suggestion, or need help? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="page-container grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-display">Get in Touch</h2>
              <p className="mt-2 text-gray-500">
                Reach out through any of these channels and we&apos;ll respond within 24 hours.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e3f0ed] text-[#2a7f6e]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Email</h3>
                  <a href="mailto:hello@rentme.ug" className="text-sm text-brand-600 hover:underline">
                    hello@rentme.ug
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e3f0ed] text-[#2a7f6e]">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Phone</h3>
                  <a href="tel:+256700000000" className="text-sm text-brand-600 hover:underline">
                    +256 700 000 000
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e3f0ed] text-[#2a7f6e]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Office</h3>
                  <p className="text-sm text-gray-500">
                    Kampala, Uganda
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="card p-6 sm:p-8">
              {sent ? (
                <div className="py-12 text-center">
                  <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                  <h2 className="mt-4 text-xl font-bold text-gray-900 font-display">
                    Message Sent!
                  </h2>
                  <p className="mt-2 text-gray-500">
                    Thanks for reaching out. We&apos;ll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSent(false);
                      setName("");
                      setEmail("");
                      setSubject("");
                      setMessage("");
                    }}
                    className="btn-secondary mt-6"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-xl font-bold text-gray-900 font-display">
                    Send a Message
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input"
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="input"
                      placeholder="How can we help?"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="input"
                      rows={5}
                      placeholder="Tell us more..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
