#!/bin/bash
# Build script that includes copying staticwebapp.config.json to dist
vite build
cp staticwebapp.config.json dist/