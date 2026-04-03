import { app, nativeImage } from 'electron';
import path from 'path';

const fallbackTrayIconDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFfSURBVDiNpZM9SwNBEIafvdxdQqKFHxCwgYWVlaX/gI2dnYWdjb/gj+fr6O/oL+gPWFlZWFhYWPgLfoCNjY2FhYWFra+5u/V6iUQSu8QdHlgGmJ155plZdnaXAOCqHBwAKLk+ADYAZQDXk1sDAB4BtwHoAogA3AG+ASLgGXDu+s4dR3d9H0ANwCqgCGAK0AIwBXgA7Lm+5wNIA5gC9F3fu+t7aQBzgAGAKcAAwBSg7/qeZ18dQAbAAqALIA1gxvWd2z4AqANYAPQATAF69rUEaAFYAIwBJvYSgDRA1/WdG3sB0AIwB5gAjO0lAHOAAYApwMBxfeeG3gC0ASwApgA9+1oCtAEsAKYAPftYArQBLABmAD37WgG0ASwAZgA9+1oDtAEsAGYAPftaB7QBmAFM7WsD0AZgBjC1ry1AG4AZwMy+dgBtAGYAM/vaCbQBmAHM7CcAtAGYAczsaxfQBmAGMLWvPUDbAWBqXwfQNfA/lR+B/6w/A/8B8AH4G2fM1X0AAAAASUVORK5CYII=';

export function getAppLogoPath() {
  return path.join(app.getAppPath(), 'src', 'assets', 'images', 'logo.png');
}

export function createTrayIcon() {
  const image = nativeImage.createFromPath(getAppLogoPath());
  if (!image.isEmpty()) {
    return image.resize({ width: 18, height: 18, quality: 'best' });
  }

  return nativeImage.createFromDataURL(fallbackTrayIconDataUrl);
}
