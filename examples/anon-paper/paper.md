# Anchor Tokens: Compact Scene Tokens for Visuomotor Policies

Anonymous authors. Paper under double-blind review.

> **Synthetic paper.** This text was written to test paper-to-figma. The method, the baselines and every number are
> invented. It describes no real system and must not be cited.

## Abstract

Visuomotor policies spend most of their compute on image tokens. We propose Anchor Tokens, a token selector that keeps
a small set of scene tokens anchored to objects the policy acts on. A frozen image encoder produces patch tokens; the
anchor selector scores them against the language instruction and keeps the top 32; a policy transformer reads the kept
tokens with the proprioceptive state and predicts an action chunk. With 32 tokens instead of 256, Anchor Tokens reaches
a mean success rate of 71.4% on four manipulation tasks, against 64.9% for full-token attention and 58.2% for random
pruning, and runs at 23 ms per step instead of 61 ms.

## 1 Introduction

Policies built on vision-language backbones read hundreds of image tokens per camera. Most of these tokens show
background. Pruning tokens at random or by attention norm removes the background, but it also removes the small objects
that the task depends on. Anchor Tokens keeps the tokens whose content matches the instruction, so a cup that the robot
must grasp stays in the input even when it covers a few patches.

Our contributions are an instruction-conditioned token selector, a training recipe that keeps the selector
differentiable, and an evaluation on four tasks with two baselines.

## 2 Method

**Pipeline.** Each camera image goes through a frozen image encoder, which outputs 256 patch tokens. The anchor
selector scores every patch token against the instruction embedding from a frozen text encoder and keeps the 32
highest scoring tokens. The policy transformer reads the kept tokens together with the proprioceptive state token and
outputs an action chunk of 8 future actions through an action head. Only the anchor selector, the policy transformer
and the action head are trained. A typical instruction in our tasks is "pick up the cup and put it on the plate".

**Anchor selector.** The selector is a two-layer MLP that maps each patch token and the instruction embedding to a
score. During training we replace the hard top-k with a straight-through estimator, so gradients reach the scores.

## 3 Experiments

We compare three token strategies with the same policy transformer: Anchor Tokens (ours, 32 tokens), Full tokens (all
256 tokens) and Random pruning (32 random tokens). Each number is the success rate over 50 trials.

Table 1: Success rate (%) on four tasks at the end of training. Higher is better.

| Method | Pick cup | Open drawer | Stack blocks | Wipe table | Mean |
|---|---|---|---|---|---|
| Anchor Tokens (ours) | 84.0 | 72.0 | 58.0 | 71.6 | 71.4 |
| Full tokens | 80.0 | 66.0 | 48.0 | 65.6 | 64.9 |
| Random pruning | 70.0 | 62.0 | 40.0 | 60.8 | 58.2 |

Table 2: Mean success rate (%) and validation action loss during training, by training steps (thousands).

| Method | Metric | 10k | 20k | 40k | 80k |
|---|---|---|---|---|---|
| Anchor Tokens (ours) | Success | 31.5 | 52.0 | 64.8 | 71.4 |
| Full tokens | Success | 35.2 | 50.1 | 59.7 | 64.9 |
| Random pruning | Success | 22.4 | 41.3 | 52.5 | 58.2 |
| Anchor Tokens (ours) | Loss | 0.412 | 0.301 | 0.244 | 0.219 |
| Full tokens | Loss | 0.398 | 0.315 | 0.268 | 0.247 |
| Random pruning | Loss | 0.455 | 0.352 | 0.297 | 0.275 |

Table 3: Cost per control step on one GPU. Lower is better for latency and memory.

| Method | Tokens | Latency (ms) | Memory (GB) |
|---|---|---|---|
| Anchor Tokens (ours) | 32 | 23 | 5.1 |
| Full tokens | 256 | 61 | 9.8 |
| Random pruning | 32 | 21 | 5.0 |

Random pruning is 2 ms faster than Anchor Tokens because it skips the selector, but its mean success rate is 13.2
points lower. Full tokens is the strongest baseline on every task, and Anchor Tokens beats it on all four tasks.

## 4 Limitations

The selector keeps a fixed number of tokens. Scenes with many relevant objects may need more than 32. We did not test
tasks with more than one camera.
