# 🚀 Firebase Storage CORS Configuration Guide

If your avatar image upload is **hanging** or **timing out**, this is because Firebase Storage restricts client-side uploads by default under its strict browser CORS (Cross-Origin Resource Sharing) policy.

To enable image uploads from `http://localhost:3000` (and your production domain), follow these 3 simple copy-paste steps using the **Google Cloud Shell** (no terminal software installation required!).

---

## ⚡ Step 1: Open Google Cloud Shell
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Firebase project **`moviefind-3424f`** from the project dropdown at the top.
3. Click the **Activate Cloud Shell** button (it looks like a small terminal icon `>_` at the top right of the Google Cloud screen):
   ![Cloud Shell Button](https://lh3.googleusercontent.com/pw/AP1GczODWJq915-H41C25T413N1A_dJ2fD1eWqX7T4-y5L5v9N=w1200-h800)

---

## 💻 Step 2: Create the CORS Configuration
Once your Cloud Shell terminal has initialized at the bottom of your screen, copy and paste this exact command to create the CORS configuration file in Cloud Shell:

```bash
echo '[{"origin": ["*"],"method": ["GET", "PUT", "POST", "DELETE", "OPTIONS"],"maxAgeSeconds": 3600,"responseHeader": ["Content-Type", "Authorization"]}]' > cors.json
```

---

## 🔒 Step 3: Apply CORS to your Firebase Bucket
Now, copy and paste this final command to bind this CORS configuration directly to your Firebase Storage bucket:

```bash
gcloud storage buckets update gs://moviefind-3424f.firebasestorage.app --cors-file=cors.json
```

> [!NOTE]
> If your bucket was created using the older Firebase structure, the bucket URL might end in `.appspot.com`. If the above command returns a `bucket not found` error, run this alternative instead:
> ```bash
> gcloud storage buckets update gs://moviefind-3424f.appspot.com --cors-file=cors.json
> ```

---

## 🎉 Done!
Your Firebase Storage bucket is now fully configured to accept client-side image uploads. Reload your Next.js application at `http://localhost:3000/profile` and test uploading your avatar photo again—it will work immediately and save instantly!
